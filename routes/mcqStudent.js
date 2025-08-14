const express = require('express');
const MCQ = require('../models/MCQ');
const MCQSubmission = require('../models/MCQSubmission');
const Student = require('../models/Student');
const auth = require('../middleware/auth');

const router = express.Router();

// Get available MCQ tests for a student's standard
router.get('/student/:studentId/available-tests', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.teacher.id;

    // Get student details to find their standard
    const student = await Student.findById(studentId).populate('standard');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get all active MCQ tests for this standard
    const mcqTests = await MCQ.find({
      standardId: student.standard._id,
      teacherId,
      isActive: true
    }).sort({ createdAt: -1 });

    // Check which tests the student has already taken
    const testResults = [];
    for (const mcq of mcqTests) {
      const submission = await MCQSubmission.findOne({
        studentId,
        mcqId: mcq._id,
        isActive: true
      });

      testResults.push({
        _id: mcq._id,
        title: mcq.title,
        description: mcq.description,
        questionsCount: mcq.questions.length,
        createdAt: mcq.createdAt,
        timeLimit: mcq.settings?.timeLimit || 30,
        hasAttempted: !!submission,
        score: submission?.score || null,
        percentage: submission?.percentage || null,
        grade: submission?.grade || null,
        completedAt: submission?.completedAt || null,
        timeTaken: submission?.formattedTimeTaken || null
      });
    }

    res.json({
      success: true,
      tests: testResults,
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        standard: student.standard ? {
          _id: student.standard._id,
          name: student.standard.name,
          division: student.standard.division
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching available tests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch available tests',
      error: error.message 
    });
  }
});

// Get MCQ test questions for student (without correct answers)
router.get('/student/test/:mcqId', auth, async (req, res) => {
  try {
    const { mcqId } = req.params;
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Check if student has already taken this test
    const existingSubmission = await MCQSubmission.findOne({
      studentId,
      mcqId,
      isActive: true
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: 'Student has already taken this test',
        submission: existingSubmission
      });
    }

    // Get the MCQ test
    const mcqTest = await MCQ.findOne({
      _id: mcqId,
      isActive: true
    });

    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    // Return questions without correct answers and explanations
    const questionsForStudent = mcqTest.questions.map((question, index) => ({
      index,
      question: question.question,
      options: question.options
      // Deliberately exclude correctAnswer and explanation
    }));

    res.json({
      success: true,
      mcqTest: {
        _id: mcqTest._id,
        title: mcqTest.title,
        description: mcqTest.description,
        questionsCount: mcqTest.questions.length,
        timeLimit: mcqTest.settings?.timeLimit || 30,
        questions: questionsForStudent
      }
    });

  } catch (error) {
    console.error('Error fetching MCQ test for student:', error);
    res.status(500).json({ 
      message: 'Failed to fetch MCQ test',
      error: error.message 
    });
  }
});

// Submit MCQ test answers
router.post('/student/submit-test', auth, async (req, res) => {
  try {
    const { studentId, mcqId, answers, timeTaken, startedAt } = req.body;
    const teacherId = req.teacher.id;

    if (!studentId || !mcqId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid submission data' });
    }

    // Check if student has already taken this test
    const existingSubmission = await MCQSubmission.findOne({
      studentId,
      mcqId,
      isActive: true
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: 'Student has already taken this test',
        existingSubmission
      });
    }

    // Get the MCQ test with correct answers
    const mcqTest = await MCQ.findById(mcqId);
    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    // Get student details
    const student = await Student.findById(studentId).populate('standard');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate score
    let correctAnswers = 0;
    const processedAnswers = answers.map((answer, index) => {
      const correctAnswer = mcqTest.questions[index].correctAnswer;
      const isCorrect = answer.selectedAnswer === correctAnswer;
      if (isCorrect) correctAnswers++;

      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeTaken: answer.timeTaken || 0
      };
    });

    const totalQuestions = mcqTest.questions.length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Create submission record
    const submission = new MCQSubmission({
      studentId,
      mcqId,
      teacherId,
      standardId: student.standard._id,
      answers: processedAnswers,
      score,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      timeTaken: timeTaken || 0,
      startedAt: new Date(startedAt) || new Date(),
      completedAt: new Date()
    });

    await submission.save();

    // Prepare result with correct answers for review
    const resultWithAnswers = mcqTest.questions.map((question, index) => {
      const studentAnswer = answers[index];
      return {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: studentAnswer.selectedAnswer,
        isCorrect: studentAnswer.selectedAnswer === question.correctAnswer,
        explanation: question.explanation
      };
    });

    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      result: {
        submissionId: submission._id,
        score,
        percentage: submission.percentage,
        grade: submission.grade,
        correctAnswers,
        incorrectAnswers,
        totalQuestions,
        timeTaken: submission.formattedTimeTaken,
        detailedResults: resultWithAnswers,
        analysis: submission.getDetailedAnalysis()
      }
    });

  } catch (error) {
    console.error('Error submitting MCQ test:', error);
    res.status(500).json({ 
      message: 'Failed to submit test',
      error: error.message 
    });
  }
});

// Get student's test history
router.get('/student/:studentId/test-history', auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    const testHistory = await MCQSubmission.getStudentTestHistory(studentId);

    res.json({
      success: true,
      testHistory: testHistory.map(submission => ({
        _id: submission._id,
        mcqTest: {
          _id: submission.mcqId._id,
          title: submission.mcqId.title,
          description: submission.mcqId.description
        },
        score: submission.score,
        percentage: submission.percentage,
        grade: submission.grade,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        timeTaken: submission.formattedTimeTaken,
        completedAt: submission.completedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching test history:', error);
    res.status(500).json({ 
      message: 'Failed to fetch test history',
      error: error.message 
    });
  }
});

// Get specific test result details
router.get('/student/test-result/:submissionId', auth, async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await MCQSubmission.findById(submissionId)
      .populate('mcqId', 'title description questions')
      .populate('studentId', 'name rollNumber');

    if (!submission) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    // Prepare detailed result
    const detailedResult = submission.mcqId.questions.map((question, index) => {
      const studentAnswer = submission.answers[index];
      return {
        questionNumber: index + 1,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: studentAnswer.selectedAnswer,
        isCorrect: studentAnswer.isCorrect,
        explanation: question.explanation,
        timeTaken: studentAnswer.timeTaken
      };
    });

    res.json({
      success: true,
      result: {
        submission: {
          _id: submission._id,
          score: submission.score,
          percentage: submission.percentage,
          grade: submission.grade,
          correctAnswers: submission.correctAnswers,
          incorrectAnswers: submission.incorrectAnswers,
          totalQuestions: submission.totalQuestions,
          timeTaken: submission.formattedTimeTaken,
          completedAt: submission.completedAt
        },
        mcqTest: {
          title: submission.mcqId.title,
          description: submission.mcqId.description
        },
        student: {
          name: submission.studentId.name,
          rollNumber: submission.studentId.rollNumber
        },
        detailedAnswers: detailedResult,
        analysis: submission.getDetailedAnalysis()
      }
    });

  } catch (error) {
    console.error('Error fetching test result:', error);
    res.status(500).json({ 
      message: 'Failed to fetch test result',
      error: error.message 
    });
  }
});

// Get MCQ test results for teacher (class performance)
router.get('/teacher/test-results/:mcqId', auth, async (req, res) => {
  try {
    const { mcqId } = req.params;
    const teacherId = req.teacher.id;

    // Verify the MCQ belongs to this teacher
    const mcqTest = await MCQ.findOne({ _id: mcqId, teacherId });
    if (!mcqTest) {
      return res.status(404).json({ message: 'MCQ test not found' });
    }

    // Get all submissions for this MCQ
    const submissions = await MCQSubmission.getMCQResults(mcqId);
    
    // Get class statistics
    const [statistics] = await MCQSubmission.getClassStatistics(mcqId);

    res.json({
      success: true,
      mcqTest: {
        _id: mcqTest._id,
        title: mcqTest.title,
        description: mcqTest.description,
        questionsCount: mcqTest.questions.length
      },
      results: submissions.map(submission => ({
        _id: submission._id,
        student: {
          _id: submission.studentId._id,
          name: submission.studentId.name,
          rollNumber: submission.studentId.rollNumber
        },
        score: submission.score,
        percentage: submission.percentage,
        grade: submission.grade,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        timeTaken: submission.formattedTimeTaken,
        completedAt: submission.completedAt
      })),
      statistics: statistics || {
        totalSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTimeTaken: 0
      }
    });

  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ 
      message: 'Failed to fetch test results',
      error: error.message 
    });
  }
});

module.exports = router;
