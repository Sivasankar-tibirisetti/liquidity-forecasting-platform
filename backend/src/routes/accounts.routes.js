
const express = require("express");
const prisma = require("../config/prisma");
const {
  calculateCashPosition,
} = require("../engines/cashPosition.engine");

const router = express.Router();

// GET /api/accounts
router.get("/", async (req, res, next) => {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: { status: "ACTIVE" },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            code: true,
            baseCurrency: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/accounts/:id/position
router.get("/:id/position", async (req, res, next) => {
  try {
    const asOfDate = req.query.asOfDate
      ? new Date(req.query.asOfDate)
      : new Date();

    if (Number.isNaN(asOfDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid asOfDate",
      });
    }

    const position = await calculateCashPosition(
      req.params.id,
      asOfDate
    );

    res.json({
      success: true,
      data: position,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
