
const prisma = require("../config/prisma");

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Loads historical FX rates and prepares a lookup for each
 * currency and forecast date.
 *
 * Rate convention:
 * 1 baseCurrency = rate quoteCurrency
 */
async function loadFxRateMap({
  currencies,
  reportingCurrency = "INR",
  startDate,
  endDate,
}) {
  const uniqueCurrencies = [
    ...new Set(currencies.filter(
      (currency) => currency !== reportingCurrency
    )),
  ];

  const rateMap = new Map();

  rateMap.set(
    `${reportingCurrency}|${dateKey(startDate)}`,
    1
  );

  const [directRates, inverseRates] = await Promise.all([
    prisma.currencyRate.findMany({
      where: {
        baseCurrency: { in: uniqueCurrencies },
        quoteCurrency: reportingCurrency,
        effectiveDate: { lte: endDate },
      },
      orderBy: { effectiveDate: "desc" },
    }),

    prisma.currencyRate.findMany({
      where: {
        baseCurrency: reportingCurrency,
        quoteCurrency: { in: uniqueCurrencies },
        effectiveDate: { lte: endDate },
      },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  const directByCurrency = new Map();
  const inverseByCurrency = new Map();

  for (const rate of directRates) {
    if (!directByCurrency.has(rate.baseCurrency)) {
      directByCurrency.set(rate.baseCurrency, []);
    }

    directByCurrency.get(rate.baseCurrency).push(rate);
  }

  for (const rate of inverseRates) {
    if (!inverseByCurrency.has(rate.quoteCurrency)) {
      inverseByCurrency.set(rate.quoteCurrency, []);
    }

    inverseByCurrency.get(rate.quoteCurrency).push(rate);
  }

  for (let current = new Date(startDate);
    current <= endDate;
    current = addDays(current, 1)
  ) {
    const keyDate = dateKey(current);

    rateMap.set(
      `${reportingCurrency}|${keyDate}`,
      1
    );

    for (const currency of uniqueCurrencies) {
      const direct = (directByCurrency.get(currency) || [])
        .find((item) => item.effectiveDate <= current);

      if (direct) {
        rateMap.set(
          `${currency}|${keyDate}`,
          Number(direct.rate)
        );
        continue;
      }

      const inverse = (inverseByCurrency.get(currency) || [])
        .find((item) => item.effectiveDate <= current);

      if (inverse && Number(inverse.rate) !== 0) {
        rateMap.set(
          `${currency}|${keyDate}`,
          1 / Number(inverse.rate)
        );
        continue;
      }

      throw new Error(
        `Missing FX rate for ${currency}/${reportingCurrency} on ${keyDate}`
      );
    }
  }

  return rateMap;
}

function getFxRate(rateMap, currency, date) {
  const key = `${currency}|${dateKey(date)}`;
  const rate = rateMap.get(key);

  if (rate === undefined) {
    throw new Error(`FX rate not found: ${key}`);
  }

  return rate;
}

function convertAmount(amount, rate) {
  return Number(amount) * Number(rate);
}

module.exports = {
  loadFxRateMap,
  getFxRate,
  convertAmount,
};
