function isEmptyString(value) {
  return typeof value === 'string' && value.trim().length === 0;
}

function mergeFieldSets(...sets) {
  return sets.reduce((acc, fields) => {
    if (!fields || typeof fields !== 'object') {
      return acc;
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) {
        continue;
      }

      const current = acc[key];

      if (current === undefined || current === null) {
        acc[key] = value;
        continue;
      }

      if (typeof value === 'string') {
        if (isEmptyString(current) && !isEmptyString(value)) {
          acc[key] = value;
        } else if (!isEmptyString(value) && current.length > value.length * 1.5) {
          acc[key] = value;
        }
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        acc[key] = {
          ...(typeof current === 'object' && !Array.isArray(current) ? current : {}),
          ...value,
        };
        continue;
      }

      acc[key] = value;
    }

    return acc;
  }, {});
}

module.exports = {
  mergeFieldSets,
};
