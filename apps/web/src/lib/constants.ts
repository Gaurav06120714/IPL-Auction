export const IPL_TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'bg-yellow-500', text: 'text-yellow-950' },
  { id: 'MI', name: 'Mumbai Indians', color: 'bg-blue-600', text: 'text-white' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'bg-red-600', text: 'text-white' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'bg-purple-800', text: 'text-gold-400' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'bg-orange-500', text: 'text-white' },
  { id: 'DC', name: 'Delhi Capitals', color: 'bg-blue-800', text: 'text-red-500' },
  { id: 'RR', name: 'Rajasthan Royals', color: 'bg-pink-500', text: 'text-white' },
  { id: 'PBKS', name: 'Punjab Kings', color: 'bg-red-500', text: 'text-gray-200' },
  { id: 'LSG', name: 'Lucknow Super Giants', color: 'bg-cyan-800', text: 'text-green-400' },
  { id: 'GT', name: 'Gujarat Titans', color: 'bg-indigo-900', text: 'text-yellow-400' },
];

export function formatMoney(lakhs: number | null | undefined): string {
  if (lakhs == null) return '0 L';
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  return `${lakhs} L`;
}

export function getNextBidAmount(currentBid: number | null, basePrice: number, category: string): number {
  if (!currentBid) return basePrice;
  const increment = category === 'goat' ? 15 : category === 'capped' ? 10 : 5;
  return currentBid + increment;
}
