export const SHELTERS = [
  { name: "Sunny Tails Rescue", dist: "0.8 km", note: "Open · vet on site" },
  { name: "City Animal Shelter", dist: "2.1 km", note: "Open · ambulance" },
  { name: "Paws & Care Clinic", dist: "3.4 km", note: "24-hour vet" },
];

export const LOST_PETS = [
  { name: "Momo", emoji: "🐕", meta: "Shiba mix · last seen Lakeside Rd · 2.3 km", tag: "lost", color: "var(--sos)" },
  { name: "Unknown", emoji: "🐈", meta: "Grey tabby found near 5th Market · 0.6 km", tag: "found", color: "var(--sage)" },
  { name: "Bruno", emoji: "🐩", meta: "Reunited with family 🎉 · yesterday", tag: "home", color: "var(--amber-deep)" },
];

export const ADOPTABLE_ANIMALS = [
  {
    name: "Daisy", emoji: "🐶", bg: "var(--amber-soft)", age: "Puppy · 4 mo", sex: "Female", size: "Small",
    tags: ["Gentle", "Good w/ kids"], shelter: "Sunny Tails Rescue",
    about: "Daisy is a sunny little soul who was found curled up near a bakery and bottle-raised by our fosters. She's playful but settles fast for cuddles, already half house-trained, and adores other dogs. She'd thrive in a home with a bit of garden and people around during the day.",
    health: ["First vaccines done", "Dewormed", "Spay scheduled at 6 mo"],
  },
  {
    name: "Rocky", emoji: "🐕‍🦺", bg: "var(--sky-soft)", age: "Adult · 3 yr", sex: "Male", size: "Large",
    tags: ["Trained", "Active"], shelter: "City Animal Shelter",
    about: "Rocky knows sit, stay and heel, and walks beautifully on a leash. He's a high-energy buddy who'd love a running or hiking partner. Best as the only pet, with older kids.",
    health: ["Fully vaccinated", "Neutered", "Microchipped"],
  },
  {
    name: "Luna", emoji: "🐈‍⬛", bg: "var(--sage-soft)", age: "Kitten · 5 mo", sex: "Female", size: "Small",
    tags: ["Cuddly", "Quiet"], shelter: "Paws & Care Clinic",
    about: "Luna is a velvet-soft shadow who purrs the moment you sit down. Shy for the first hour, then your lap is hers forever. Litter-trained and happy as an indoor cat.",
    health: ["First vaccines done", "Dewormed", "Spay scheduled"],
  },
  {
    name: "Coco", emoji: "🦮", bg: "var(--coral-soft)", age: "Senior · 8 yr", sex: "Male", size: "Medium",
    tags: ["Calm", "Lap dog"], shelter: "Sunny Tails Rescue",
    about: "Coco is a gentle senior who asks for little: a soft bed, two short strolls and someone to lean on. Wonderful with children and other calm pets. A senior adopter's dream.",
    health: ["Fully vaccinated", "Neutered", "On joint supplements"],
  },
];

export const SYMPTOMS = [
  "Limping", "Not eating", "Vomiting", "Lethargy", "Bleeding",
  "Trouble breathing", "Scratching a lot", "Diarrhea", "Whining in pain", "Swelling",
];

export const URGENT_SYMPTOMS = new Set(["Bleeding", "Trouble breathing", "Whining in pain", "Vomiting"]);

export const RESCUE_ISSUES = ["Injured", "Sick", "Trapped", "Hit by vehicle", "Abandoned", "Aggressive"];

export const fade = { animation: "rise .35s ease" };
