export const formatNumber = (value, maxDecimals = 4) => {
  const num = Number(value);

  if (!Number.isFinite(num)) return "0";

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

export const getPrimaryCurrency = (currencies = []) =>
  currencies.find((currency) => Number(currency?.isPrimary) === 1) ||
  currencies[0] ||
  null;

export const formatMoney = (value, currency, options = {}) => {
  const num = Number(value);
  const symbol =
    currency?.symbol ||
    currency?.currency_symbol ||
    currency?.fund_currency_symbol ||
    "";
  const code =
    currency?.code ||
    currency?.currency_code ||
    currency?.fund_currency_code ||
    "";
  const suffix = options.showCode && code ? ` ${code}` : "";

  const formatted = Number.isFinite(num)
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: options.minimumFractionDigits ?? 2,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
      })
    : "0.00";

  return symbol ? `${symbol}${formatted}${suffix}` : `${formatted}${suffix}`;
};
