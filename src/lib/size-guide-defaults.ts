/** Starting charts. The owner edits them in Dashboard → Size guides (these are only used until then). Measurements are approximate: check them against your own stitching. */
export interface SizeGuideData { slug: string; name: string; unit: string; columns: string[]; rows: string[][]; tips: string[] }

export const DEFAULT_SIZE_GUIDES: SizeGuideData[] = [
  {
    slug: "women",
    name: "Women",
    unit: "inches",
    columns: ["Size", "Bust", "Waist", "Hip", "Shoulder"],
    rows: [
      ["XS", "32", "26", "35", "13.5"],
      ["S", "34", "28", "37", "14"],
      ["M", "36", "30", "39", "14.5"],
      ["L", "38", "32", "41", "15"],
      ["XL", "40", "34", "43", "15.5"],
      ["XXL", "42", "36", "45", "16"],
      ["XXXL", "44", "38", "47", "16.5"],
    ],
    tips: [
      "Measure over light innerwear with the tape snug, not tight.",
      "Between two sizes? Pick the larger one for a relaxed fit.",
      "Need help? Send us your measurements on WhatsApp and we will suggest your size.",
    ],
  },
  {
    slug: "kids",
    name: "Kids",
    unit: "inches",
    columns: ["Age", "Height", "Chest", "Waist"],
    rows: [
      ["0-6 M", "22-26", "16", "16"],
      ["6-12 M", "26-29", "17", "17"],
      ["1-2 Y", "29-34", "18", "18"],
      ["2-3 Y", "34-37", "19", "19"],
      ["3-4 Y", "37-40", "20", "19.5"],
      ["4-5 Y", "40-43", "21", "20"],
      ["5-6 Y", "43-46", "22", "20.5"],
      ["6-7 Y", "46-49", "23", "21"],
      ["7-8 Y", "49-52", "24", "21.5"],
      ["8-9 Y", "52-54", "25", "22"],
      ["9-10 Y", "54-56", "26", "22.5"],
      ["10-12 Y", "56-60", "27.5", "23.5"],
      ["12-14 Y", "60-64", "29", "25"],
    ],
    tips: [
      "Choose by your child's age, but check the height too: kids of the same age can differ a lot.",
      "Between two sizes? Pick the larger one so the outfit lasts longer.",
      "Need help? Send us your child's height on WhatsApp and we will suggest a size.",
    ],
  },
];