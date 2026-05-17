async function allocatePayment(client, schoolId, studentId, paymentAmount) {
  const structureResult = await client.query(
    `
    SELECT category, amount, priority
    FROM fee_structure
    WHERE school_id = $1
      AND student_id = $2
    ORDER BY priority ASC, id ASC
    `,
    [schoolId, studentId]
  );

  const feeStructure = structureResult.rows;

  // No fee structure: assign everything to Tuition
  if (feeStructure.length === 0) {
    return {
      Tuition: Number(paymentAmount),
    };
  }

  const paidResult = await client.query(
    `
    SELECT allocation
    FROM payments
    WHERE school_id = $1
      AND student_id = $2
    `,
    [schoolId, studentId]
  );

  const alreadyPaid = {};

  for (const row of paidResult.rows) {
    const allocation = row.allocation || {};
    for (const [category, amount] of Object.entries(allocation)) {
      alreadyPaid[category] =
        (alreadyPaid[category] || 0) + Number(amount);
    }
  }

  let remaining = Number(paymentAmount);
  const newAllocation = {};

  for (const item of feeStructure) {
    if (remaining <= 0) break;

    const required = Number(item.amount);
    const paid = alreadyPaid[item.category] || 0;
    const outstanding = Math.max(required - paid, 0);

    if (outstanding <= 0) continue;

    const allocate = Math.min(remaining, outstanding);

    newAllocation[item.category] = allocate;
    remaining -= allocate;
  }

  // Overpayments go to Advance
  if (remaining > 0) {
    newAllocation.Advance =
      (newAllocation.Advance || 0) + remaining;
  }

  return newAllocation;
}

module.exports = allocatePayment;