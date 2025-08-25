const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const MCQ = require('../models/MCQ');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    
    // Ensure the uploads directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to convert image to base64
async function fileToGenerativePart(path, mimeType) {
  const data = await fs.readFile(path);
  return {
    inlineData: {
      data: data.toString('base64'),
      mimeType,
    },
  };
}

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {// Check if it's a 503 Service Unavailable error or overloaded
      if (error.message.includes('503') || 
          error.message.includes('overloaded') || 
          error.message.includes('Service Unavailable') ||
          error.message.includes('temporarily unavailable')) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // If it's not a retryable error or we've exhausted retries, throw it
      throw error;
    }
  }
}

// Add endpoint to check API status
router.get('/status', auth, async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Simple test to check if API is working
    const testPrompt = "Respond with just the word 'OK' if you can process this request.";
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();
    
    res.json({
      success: true,
      status: 'available',
      message: 'Gemini AI service is operational',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API status check failed:', error);
    
    const isOverloaded = error.message.includes('503') || 
                        error.message.includes('overloaded') || 
                        error.message.includes('Service Unavailable');
    
    res.status(isOverloaded ? 503 : 500).json({
      success: false,
      status: isOverloaded ? 'overloaded' : 'error',
      message: isOverloaded ? 'Gemini AI service is temporarily overloaded' : 'Gemini AI service error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate MCQ questions from book image
router.post('/generate', auth, upload.single('image'), async (req, res) => {
  try {
    const { questionCount, bookLanguage, questionLanguage, standardId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    if (!questionCount || questionCount < 1 || questionCount > 20) {
      return res.status(400).json({ message: 'Question count must be between 1 and 20' });
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Convert image to generative part
    const imagePart = await fileToGenerativePart(req.file.path, req.file.mimetype);

    // Create prompt for MCQ generation
    const prompt = `
    Analyze this book page image and create ${questionCount} multiple choice questions (MCQs) based on the content.

    Instructions:
    - The book content is in ${bookLanguage} language
    - Generate questions in ${questionLanguage} language
    - Create exactly ${questionCount} questions
    - Each question should have 4 options (A, B, C, D)
    - Include the correct answer index (0-3)
    - Add a brief explanation for each correct answer
    - Focus on key concepts, facts, and important information from the text
    - Make questions challenging but fair for students
    - Ensure questions test understanding, not just memorization

    Return the response in this exact JSON format:
    {
      "questions": [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Brief explanation of why this answer is correct"
        }
      ]
    }

    Important: Return only valid JSON, no additional text or markdown formatting.
    `;

    // Generate content with retry logic
    const generateWithRetry = async () => {
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    };

    let generatedText;
    try {generatedText = await retryWithBackoff(generateWithRetry, 3, 2000);} catch (retryError) {
      console.error('All retry attempts failed:', retryError);
      
      // Check if it's a service unavailable error
      if (retryError.message.includes('503') || 
          retryError.message.includes('overloaded') || 
          retryError.message.includes('Service Unavailable') ||
          retryError.message.includes('temporarily unavailable')) {
        return res.status(503).json({ 
          message: 'AI service is temporarily overloaded. Please try again in a few minutes.',
          error: 'Service temporarily unavailable',
          retryable: true,
          suggestedRetryDelay: 60000, // 1 minute
          timestamp: new Date().toISOString(),
          details: 'Google\'s Gemini AI service is experiencing high demand. This is temporary and usually resolves within a few minutes.'
        });
      }
      
      // For other errors, return generic error
      return res.status(500).json({ 
        message: 'Failed to generate MCQ questions. Please try again.',
        error: retryError.message,
        retryable: false,
        timestamp: new Date().toISOString()
      });
    }

    // Clean up the response to ensure it's valid JSON
    generatedText = generatedText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();

    let mcqData;
    try {
      mcqData = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Generated Text:', generatedText);
      return res.status(500).json({ 
        message: 'Failed to parse AI response. Please try again.',
        error: parseError.message 
      });
    }

    // Validate the response structure
    if (!mcqData.questions || !Array.isArray(mcqData.questions)) {
      return res.status(500).json({ message: 'Invalid response format from AI' });
    }

    // Validate each question
    const validatedQuestions = mcqData.questions.map((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Invalid question format at index ${index}`);
      }
      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'No explanation provided'
      };
    });

    // Clean up uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
    }

    res.json({
      success: true,
      questions: validatedQuestions,
      metadata: {
        questionCount: validatedQuestions.length,
        bookLanguage,
        questionLanguage,
        standardId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating MCQ:', error);
    
    // Clean up uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({ 
      message: 'Failed to generate MCQ questions',
      error: error.message 
    });
  }
});

// Save MCQ test
router.post('/save', auth, async (req, res) => {
  try {
    const { standardId, questions, title, description } = req.body;
    const teacherId = req.teacher.id;

    if (!standardId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return res.status(400).json({ message: `Invalid question format at index ${i}` });
      }
    }

    const mcqTest = new MCQ({
      title: title || `MCQ Test - ${new Date().toLocaleDateString()}`,
      description: description || 'AI Generated MCQ Test',
      standardId,
      teacherId,
      questions,
      createdAt: new Date(),
      isActive: true
    });

    await mcqTest.save();

    res.status(201).json({
      success: true,
      message: 'MCQ test saved successfully',
      mcqId: mcqTest._id,
      questionsCount: questions.length
    });

  } catch (error) {
    console.error('Error saving MCQ:', error);
    res.status(500).json({ 
      message: 'Failed to save MCQ test',
      error: error.message 
    });
  }
});

// Get MCQ tests for a standard
router.get('/standard/:standardId', auth, async (req, res) => {
  try {
    const { standardId } = req.params;
    const teacherId = req.teacher.id;

    const mcqTests = await MCQ.find({
      standardId,
      teacherId,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      mcqTests: mcqTests.map(test => ({
        _id: test._id,
        title: test.title,
        description: test.description,
        questionsCount: test.questions.length,
        createdAt: test.createdAt,
        standardId: test.standardId
      }))
    });

  } catch (error) {
    console.error('Error fetching MCQ tests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch MCQ tests',
      error: error.message 
    });
  }
});

// Get specific MCQ test
router.get('/:mcqId', auth, async (req, res) => {
  try {
    const { mcqId } = req.params;
    const teacherId = req.teacher.id;

    const mcqTest = await MCQ.findOne({
      _id: mcqId,
      teacherId,
      isActive: true
    });

    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    res.json({
      success: true,
      mcqTest
    });

  } catch (error) {
    console.error('Error fetching MCQ test:', error);
    res.status(500).json({ 
      message: 'Failed to fetch MCQ test',
      error: error.message 
    });
  }
});

// Delete MCQ test
router.delete('/:mcqId', auth, async (req, res) => {
  try {
    const { mcqId } = req.params;
    const teacherId = req.teacher.id;

    const mcqTest = await MCQ.findOne({
      _id: mcqId,
      teacherId
    });

    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    mcqTest.isActive = false;
    await mcqTest.save();

    res.json({
      success: true,
      message: 'MCQ test deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting MCQ test:', error);
    res.status(500).json({ 
      message: 'Failed to delete MCQ test',
      error: error.message 
    });
  }
});

// Update MCQ test
router.put('/:mcqId', auth, async (req, res) => {
  try {
    const { mcqId } = req.params;
    const { questions, title, description } = req.body;
    const teacherId = req.teacher.id;

    // Validate required fields
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Questions array is required and must contain at least one question' 
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question || !question.options || !Array.isArray(question.options) || 
          question.options.length < 2 || typeof question.correctAnswer !== 'number') {
        return res.status(400).json({ 
          message: `Invalid question format at index ${i}` 
        });
      }
    }

    // Find the MCQ test
    const mcqTest = await MCQ.findOne({
      _id: mcqId,
      teacherId,
      isActive: true
    });

    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    // Update the MCQ test
    mcqTest.questions = questions;
    mcqTest.questionsCount = questions.length;
    
    if (title) mcqTest.title = title;
    if (description) mcqTest.description = description;
    
    mcqTest.updatedAt = new Date();

    await mcqTest.save();

    res.json({
      success: true,
      mcqId: mcqTest._id,
      message: 'MCQ test updated successfully'
    });

  } catch (error) {
    console.error('Error updating MCQ test:', error);
    res.status(500).json({ 
      message: 'Failed to update MCQ test',
      error: error.message 
    });
  }
});

module.exports = router;
