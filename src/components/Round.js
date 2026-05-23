function Round({ blind, ante, BlindValues }) {
  const baseChips = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];
  const blindMultiplier = [1, 1.5, 2][blind - 1];
  const requiredScore = baseChips[ante - 1] * blindMultiplier;
  const award = "💲".repeat(2 + blind);

  return (
    <div className="round-info">
      <h3>{BlindValues[blind]}</h3>
      <h4>Score at least: {requiredScore}</h4>
      <p>to earn {award}</p>
    </div>
  );
}

export default Round;
