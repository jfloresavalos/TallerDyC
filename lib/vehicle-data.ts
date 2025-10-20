export const CAR_BRANDS_AND_MODELS: Record<string, string[]> = {
  Toyota: ["Corolla", "Camry", "Hilux", "Fortuner", "Yaris", "Avanza", "Innova", "RAV4", "Prius"],
  Honda: ["Civic", "Accord", "CR-V", "Fit", "Odyssey", "Pilot", "HR-V"],
  Nissan: ["Sentra", "Altima", "Qashqai", "X-Trail", "Frontier", "Versa", "Kicks"],
  Hyundai: ["Elantra", "Sonata", "Tucson", "Santa Fe", "Accent", "Creta", "i10"],
  Kia: ["Cerato", "Sorento", "Sportage", "Picanto", "Rio", "Seltos"],
  Volkswagen: ["Jetta", "Passat", "Polo", "Golf", "Tiguan", "Amarok"],
  Ford: ["Fiesta", "Focus", "Fusion", "Ranger", "Escape", "Explorer"],
  Chevrolet: ["Spark", "Cruze", "Malibu", "Trax", "Equinox", "Silverado"],
  BMW: ["320i", "330i", "X3", "X5", "M340i", "M440i"],
  Mercedes: ["C200", "C300", "E300", "GLC", "GLE", "A200"],
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7"],
  Mazda: ["Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-5", "CX-9"],
  Subaru: ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek"],
  Mitsubishi: ["Lancer", "Outlander", "Pajero", "Mirage", "ASX"],
  Suzuki: ["Swift", "Vitara", "Ertiga", "Ciaz"],
  Jeep: ["Wrangler", "Cherokee", "Compass", "Renegade"],
  Renault: ["Duster", "Sandero", "Logan", "Koleos"],
  Peugeot: ["208", "308", "3008", "5008"],
  Fiat: ["Argo", "Cronos", "Toro", "Uno"],
  Chery: ["Tiggo", "QQ", "Arrizo"],
}

export const CAR_BRANDS = Object.keys(CAR_BRANDS_AND_MODELS).sort()
