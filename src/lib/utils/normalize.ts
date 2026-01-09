import { NormalizeMode } from '../../types';

/**
 * Determine the dominant sign for each row
 * Returns an array of 1 (positive dominant) or -1 (negative dominant)
 */
export function determineDominantSigns(data: number[][]): number[] {
  const signs: number[] = [];

  // First pass: determine signs based on count majority
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let positiveCount = 0;
    let negativeCount = 0;

    for (const val of row) {
      if (!isNaN(val)) {
        if (val > 0) positiveCount++;
        else if (val < 0) negativeCount++;
      }
    }

    if (positiveCount > negativeCount) {
      signs.push(1);
    } else if (negativeCount > positiveCount) {
      signs.push(-1);
    } else {
      // Equal count - will be resolved in second pass
      signs.push(0);
    }
  }

  // Second pass: resolve ties by looking at neighbors
  for (let i = 0; i < signs.length; i++) {
    if (signs[i] === 0) {
      if (i === 0) {
        // First row: look at next row
        for (let j = 1; j < signs.length; j++) {
          if (signs[j] !== 0) {
            signs[i] = signs[j];
            break;
          }
        }
        // If all are ties, default to positive
        if (signs[i] === 0) signs[i] = 1;
      } else {
        // Other rows: use previous row's sign
        signs[i] = signs[i - 1];
      }
    }
  }

  return signs;
}

/**
 * Apply sign normalization to data
 * Flips signs so all values match the dominant sign of their row
 */
export function applySignNormalization(data: number[][]): number[][] {
  const dominantSigns = determineDominantSigns(data);

  return data.map((row, i) => {
    const dominantSign = dominantSigns[i];
    return row.map(val => {
      if (isNaN(val)) return val;
      // If value's sign matches dominant, keep it. Otherwise, flip.
      const valSign = val >= 0 ? 1 : -1;
      return valSign === dominantSign ? val : -val;
    });
  });
}

/**
 * Apply absolute value transformation to data
 */
export function applyAbsoluteValue(data: number[][]): number[][] {
  return data.map(row => row.map(val => isNaN(val) ? val : Math.abs(val)));
}

/**
 * Apply normalization based on mode
 */
export function applyNormalization(data: number[][], mode: NormalizeMode): number[][] {
  switch (mode) {
    case 'sign':
      return applySignNormalization(data);
    case 'absolute':
      return applyAbsoluteValue(data);
    default:
      return data;
  }
}
