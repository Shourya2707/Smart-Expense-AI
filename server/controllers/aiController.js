const Expense = require("../models/Expense");
const Income = require("../models/Income");

// Helper to extract JSON from AI text response safely
const extractJSON = (text) => {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip standard markdown fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // If direct parse fails, find opening and closing array or object
    const firstBracket = cleaned.search(/[{\[]/);
    const lastBracket = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        const candidate = cleaned.slice(firstBracket, lastBracket + 1);
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
    return null;
  }
};

// @desc    Get rule-based spending insights (fallback)
// @route   GET /api/ai/insights
// @access  Private
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({ userId });
    const incomes = await Income.find({ userId });

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    const categoryMap = {};
    expenses.forEach((exp) => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
    const insights = [];

    if (expenses.length === 0 && incomes.length === 0) {
      insights.push({
        type: "info",
        title: "Get Started",
        message: "Add your first income and expense to unlock personalized AI insights.",
      });
    } else {
      if (savingsRate >= 20) {
        insights.push({
          type: "success",
          title: "Great Savings Habit",
          message: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep it up!`,
        });
      } else if (savingsRate < 0) {
        insights.push({
          type: "warning",
          title: "Overspending Alert",
          message: `Your expenses exceed income by ₹${Math.abs(savings).toFixed(2)}. Review your spending.`,
        });
      } else {
        insights.push({
          type: "info",
          title: "Savings Opportunity",
          message: `Your savings rate is ${savingsRate.toFixed(1)}%. Try to reach 20% for better financial health.`,
        });
      }

      if (topCategory) {
        const [category, amount] = topCategory;
        const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        insights.push({
          type: "info",
          title: "Top Spending Category",
          message: `${category} accounts for ${percentage.toFixed(1)}% (₹${amount.toFixed(2)}) of your expenses.`,
        });

        if (percentage > 40) {
          insights.push({
            type: "warning",
            title: "Category Concentration",
            message: `Consider reducing ${category} spending — it is over 40% of your total expenses.`,
          });
        }
      }

      const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
      insights.push({
        type: "info",
        title: "Spending Pattern",
        message: `Average expense: ₹${avgExpense.toFixed(2)} across ${expenses.length} transactions.`,
      });
    }

    res.status(200).json({ success: true, data: insights });
  } catch (error) {
    console.error("AI Insights Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get Gemini AI-powered insights
// @route   GET /api/ai/gemini-insights
// @access  Private
exports.getGeminiInsights = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // If no Gemini key, fall back to rule-based insights
    if (!apiKey) {
      return exports.getInsights(req, res);
    }

    const userId = req.user._id;
    const expenses = await Expense.find({ userId }).sort({ date: -1 }).limit(100);
    const incomes = await Income.find({ userId }).sort({ date: -1 }).limit(100);

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);

    // Build category summary
    const categoryMap = {};
    expenses.forEach((exp) => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    // Build source summary
    const sourceMap = {};
    incomes.forEach((inc) => {
      sourceMap[inc.source] = (sourceMap[inc.source] || 0) + inc.amount;
    });

    const financialSummary = `
User Financial Summary:
- Total Income: ₹${totalIncome.toFixed(2)} from ${incomes.length} records
- Total Expenses: ₹${totalExpenses.toFixed(2)} from ${expenses.length} records
- Net Savings: ₹${(totalIncome - totalExpenses).toFixed(2)}
- Savings Rate: ${totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : 0}%

Expense Breakdown by Category:
${Object.entries(categoryMap).map(([cat, amt]) => `  - ${cat}: ₹${amt.toFixed(2)}`).join("\n")}

Income Sources:
${Object.entries(sourceMap).map(([src, amt]) => `  - ${src}: ₹${amt.toFixed(2)}`).join("\n")}

Recent Expenses (last 5):
${expenses.slice(0, 5).map((e) => `  - ${e.description}: ₹${e.amount.toFixed(2)} (${e.category}, ${new Date(e.date).toLocaleDateString()})`).join("\n")}
    `.trim();

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an elite personal finance AI advisor. Analyze this financial summary and provide 3-5 actionable insights. Each insight must have: type ("success", "warning", or "info"), a short title, and a concise message (1-2 sentences max).

${financialSummary}

Respond ONLY with a valid JSON array of objects with keys: type, title, message. Do not include markdown formatting or code blocks.
Example format: [{"type":"info","title":"Example","message":"Example message."}]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const insights = extractJSON(responseText);

    if (!Array.isArray(insights)) {
      return exports.getInsights(req, res);
    }

    // Validate structure
    const validInsights = insights.filter(
      (i) => i.type && i.title && i.message && ["success", "warning", "info"].includes(i.type)
    );

    if (validInsights.length === 0) {
      return exports.getInsights(req, res);
    }

    res.status(200).json({ success: true, data: validInsights, source: "gemini" });
  } catch (error) {
    console.error("Gemini Insights Error:", error.message);
    return exports.getInsights(req, res);
  }
};

// @desc    Analyze receipt image with Gemini Vision
// @route   POST /api/ai/scan-receipt
// @access  Private
exports.scanReceipt = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: "AI receipt scanning is not configured. Please add GEMINI_API_KEY to the server environment.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type. Please upload a JPEG, PNG, or WebP image." });
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString("base64");

    const prompt = `Analyze this receipt image carefully and extract the following information. If a field cannot be determined, use reasonable defaults.

Return ONLY a valid JSON object with these keys:
- merchant: the store or business name (string)
- amount: the total amount paid (number, digits only)
- date: the date on the receipt in YYYY-MM-DD format (string)
- category: classify into exactly one of: Food, Travel, Shopping, Bills, Entertainment, Health, Education, Others (string)
- description: a brief description of the purchase (string)
- items: an array of line items if visible, each with name and price (array of objects)

Do not include markdown code fences. Just the raw JSON object.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: req.file.mimetype,
        },
      },
    ]);

    const responseText = result.response.text();
    const receiptData = extractJSON(responseText);

    if (!receiptData || typeof receiptData !== "object") {
      throw new Error("Could not parse receipt data from AI output");
    }

    // Normalize category case-insensitively
    const validCategories = ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Education", "Others"];
    const matchedCategory = validCategories.find(
      (cat) => cat.toLowerCase() === (receiptData.category || "").toLowerCase()
    ) || "Others";

    const extracted = {
      merchant: receiptData.merchant || "",
      amount: typeof receiptData.amount === "number" ? receiptData.amount : parseFloat(receiptData.amount) || 0,
      date: receiptData.date || new Date().toISOString().split("T")[0],
      category: matchedCategory,
      description: receiptData.description || receiptData.merchant || "Receipt Expense",
      items: Array.isArray(receiptData.items) ? receiptData.items : [],
    };

    res.status(200).json({
      success: true,
      data: extracted,
      message: "Receipt analyzed successfully. Please review and confirm the details.",
    });
  } catch (error) {
    console.error("Scan Receipt Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to analyze receipt. Please try again or enter the details manually.",
    });
  }
};
