// Sprint 15 — Smart Allocation Engine (Africa School Model)

function allocatePayment(amount) {
  const total = Number(amount);

  if (!total || total <= 0) {
    return {
      tuition: 0,
      lunch: 0,
      transport: 0,
      adjustment: 0,
    };
  }

  const allocation = {};

  // PRIORITY RULES (edit later per school policy)
  const tuition = Math.floor(total * 0.6);
  const lunch = Math.floor(total * 0.2);
  const transport = Math.floor(total * 0.2);

  allocation.tuition = tuition;
  allocation.lunch = lunch;
  allocation.transport = transport;

  // Fix rounding remainder
  const used = tuition + lunch + transport;
  allocation.adjustment = total - used;

  return allocation;
}

module.exports = { allocatePayment };