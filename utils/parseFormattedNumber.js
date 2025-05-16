function parseFormattedNumber(value) {
  if (typeof value !== 'string') return parseFloat(value) || 0;

  const multiplier = value.includes('M') ? 1_000_000 :
                     value.includes('K') ? 1_000 : 1;

  return parseFloat(value.replace(/[^\d.]/g, '')) * multiplier;
}
