export function settle(paid: boolean, total: number): number {
  if (paid) {
    return 0;
  }

  if (total > 100) {
    return total * 0.9;
  }

  return total;
}

export function classify(kind: string): number {
  if (kind === 'gift') {
    return 1;
  }

  if (kind === 'loan') {
    return 2;
  }

  return 3;
}

export class Till {
  open(): number {
    return 1;
  }

  charge(amount: number): number {
    if (amount > 0) {
      return amount;
    }

    return 0;
  }
}
