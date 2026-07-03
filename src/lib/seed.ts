// Dev-only: loads 20 realistic fake leads for QA. Reachable from Settings in
// dev builds and as window.__seedPipeline() in the console.

import type { LeadStatus, PropertyType, Temperature } from '../types';
import { db } from './db';
import { addDaysString } from './dates';

interface SeedRow {
  name: string;
  phone: string;
  email?: string;
  source: string;
  propertyType?: PropertyType;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  temperature: Temperature;
  status: LeadStatus;
  tags: string[];
  notes: string;
  followUpInDays?: number; // relative to today; negative = overdue
}

const M = 1_000_000;

const ROWS: SeedRow[] = [
  { name: 'Chinedu Okafor', phone: '08031234501', source: 'event', propertyType: 'land', budgetMin: 5 * M, budgetMax: 10 * M, location: 'Ede', temperature: 'hot', status: 'viewing', tags: ['investor'], notes: 'Wants 2 plots, cash ready. Prefers corner piece.', followUpInDays: -2 },
  { name: 'Amaka Eze', phone: '08052234502', email: 'amaka.eze@gmail.com', source: 'Instagram', propertyType: 'rental', budgetMin: 1.5 * M, budgetMax: 2.5 * M, location: 'Lekki Phase 1', temperature: 'warm', status: 'contacted', tags: [], notes: '2-bed flat, moving in September.', followUpInDays: 0 },
  { name: 'Tunde Bakare', phone: '08163234503', source: 'referral', propertyType: 'buy', budgetMin: 45 * M, budgetMax: 60 * M, location: 'Magodo', temperature: 'hot', status: 'negotiating', tags: ['urgent'], notes: 'Offer in on the duplex. Waiting on his bank.', followUpInDays: 0 },
  { name: 'Ngozi Adeleke', phone: '07034234504', source: 'walk-in', propertyType: 'land', budgetMax: 8 * M, location: 'Epe', temperature: 'cold', status: 'new', tags: [], notes: 'Just browsing options for next year.', followUpInDays: 12 },
  { name: 'Ibrahim Musa', phone: '08095234505', email: 'imusa@yahoo.com', source: 'event', propertyType: 'lease', budgetMin: 3 * M, location: 'Ikeja GRA', temperature: 'warm', status: 'contacted', tags: ['office'], notes: 'Office space for his logistics startup, 6 seats.', followUpInDays: 1 },
  { name: 'Funke Alabi', phone: '08026234506', source: 'referral', propertyType: 'buy', budgetMin: 25 * M, budgetMax: 35 * M, location: 'Gbagada', temperature: 'warm', status: 'viewing', tags: ['diaspora'], notes: 'Based in UK, sister will do viewings. WhatsApp only.', followUpInDays: -1 },
  { name: 'Emeka Nwosu', phone: '08137234507', source: 'Instagram', propertyType: 'land', budgetMin: 2 * M, budgetMax: 4 * M, location: 'Mowe', temperature: 'cold', status: 'contacted', tags: [], notes: 'Asked for payment plan options.', followUpInDays: 20 },
  { name: 'Blessing Okon', phone: '07068234508', email: 'blessingokon@outlook.com', source: 'event', propertyType: 'rental', budgetMax: 1.2 * M, location: 'Yaba', temperature: 'warm', status: 'new', tags: ['first-timer'], notes: 'Studio or mini flat near tech cluster.', followUpInDays: 2 },
  { name: 'Kola Adeyemi', phone: '08089234509', source: 'referral', propertyType: 'buy', budgetMin: 80 * M, location: 'Banana Island', temperature: 'hot', status: 'viewing', tags: ['vip', 'investor'], notes: 'Waterfront only. Discreet — call after 6pm.', followUpInDays: -4 },
  { name: 'Hauwa Bello', phone: '08141234510', source: 'walk-in', propertyType: 'land', budgetMin: 6 * M, budgetMax: 9 * M, location: 'Kuje, Abuja', temperature: 'warm', status: 'contacted', tags: [], notes: 'Wants C of O verified before commitment.', followUpInDays: 3 },
  { name: 'Segun Oladipo', phone: '09012234511', email: 'segun.ola@gmail.com', source: 'event', propertyType: 'other', temperature: 'cold', status: 'new', tags: [], notes: 'Met at Ede expo, vague about budget. Nurture.', followUpInDays: 30 },
  { name: 'Chiamaka Obi', phone: '08053234512', source: 'Instagram', propertyType: 'rental', budgetMin: 2 * M, budgetMax: 3 * M, location: 'Surulere', temperature: 'warm', status: 'contacted', tags: [], notes: '3-bed for family, needs parking for 2 cars.', followUpInDays: 0 },
  { name: 'Yusuf Danladi', phone: '08064234513', source: 'referral', propertyType: 'land', budgetMin: 15 * M, budgetMax: 20 * M, location: 'Ibeju-Lekki', temperature: 'hot', status: 'negotiating', tags: ['investor'], notes: '5 plots near the free trade zone. Price haggling.', followUpInDays: -1 },
  { name: 'Adaeze Kalu', phone: '07075234514', email: 'adaezek@gmail.com', source: 'event', propertyType: 'buy', budgetMin: 30 * M, budgetMax: 40 * M, location: 'Ajah', temperature: 'warm', status: 'viewing', tags: [], notes: 'Saw the semi-detached, wants husband to see it.', followUpInDays: 1 },
  { name: 'Femi Ogunleye', phone: '08096234515', source: 'walk-in', propertyType: 'lease', budgetMin: 5 * M, location: 'Victoria Island', temperature: 'cold', status: 'dead', tags: [], notes: 'Went with another agent. Keep for next cycle.' },
  { name: 'Zainab Suleiman', phone: '08107234516', source: 'Instagram', propertyType: 'rental', budgetMax: 1.8 * M, location: 'Wuse 2, Abuja', temperature: 'warm', status: 'contacted', tags: [], notes: 'Relocating from Lagos in October.', followUpInDays: 5 },
  { name: 'Obinna Chukwu', phone: '08028234517', email: 'obinnac@hotmail.com', source: 'referral', propertyType: 'buy', budgetMin: 55 * M, budgetMax: 70 * M, location: 'Ikoyi', temperature: 'hot', status: 'closed', tags: ['vip'], notes: 'CLOSED — 4-bed terrace. Ask for referrals in 3 months.' },
  { name: 'Kemi Adesanya', phone: '08139234518', source: 'event', propertyType: 'land', budgetMin: 3 * M, budgetMax: 5 * M, location: 'Abeokuta', temperature: 'warm', status: 'new', tags: ['first-timer'], notes: 'Birthday gift plot for her mum. Sentimental buy.', followUpInDays: 2 },
  { name: 'Musa Garba', phone: '07050234519', source: 'walk-in', propertyType: 'rental', budgetMax: 900_000, location: 'Ogba', temperature: 'cold', status: 'contacted', tags: [], notes: 'Single room self-con, ASAP.', followUpInDays: 7 },
  { name: 'Tola Fashola', phone: '08091234520', email: 'tolafash@gmail.com', source: 'referral', propertyType: 'buy', budgetMin: 100 * M, location: 'Osborne, Ikoyi', temperature: 'hot', status: 'new', tags: ['vip', 'investor'], notes: 'Referred by Obinna. Looking for off-plan towers.', followUpInDays: 0 },
];

export function seed(): number {
  for (const row of ROWS) {
    const { followUpInDays, ...rest } = row;
    db.createLead({
      ...rest,
      nextFollowUp: followUpInDays !== undefined ? addDaysString(followUpInDays) : undefined,
    });
  }
  return ROWS.length;
}
