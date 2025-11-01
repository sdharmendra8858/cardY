export function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}

export function generateRandomName(): string {
  const adjectives = [
    "Brave",
    "Clever",
    "Eager",
    "Happy",
    "Jolly",
    "Kind",
    "Lively",
    "Mighty",
    "Proud",
    "Witty",
    "Gentle",
    "Bold",
    "Calm",
    "Curious",
    "Graceful",
    "Honest",
    "Noble",
    "Sharp",
    "Wise",
    "Fierce",
  ];

  const scientists = [
    "Einstein",
    "Curie",
    "Newton",
    "Darwin",
    "Tesla",
    "Galileo",
    "Turing",
    "Lovelace",
    "Franklin",
    "Pasteur",
    "Bohr",
    "Feynman",
    "Planck",
    "Fermi",
    "Nash",
    "Galois",
    "Babbage",
    "Hawking",
    "Noether",
    "Morse",
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const scientist = scientists[Math.floor(Math.random() * scientists.length)];
  return `${adjective} ${scientist}`;
}
