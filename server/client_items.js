/**
 * Client's item master. All material is stocked in kg.
 * Format per category: [code prefix, category, [item names...]]
 */
const LIST = [
  ['SEM', 'Semi Pipes', [
    'Semi Pipe 3x3 - 26kg', 'Semi Pipe 3x3 - 22kg',
    'Semi Pipe 3x1.5 - 26kg', 'Semi Pipe 3x1.5 - 22kg', 'Semi Pipe 3x1.5 - 18kg',
    'Semi Pipe 3x1 - 14kg', 'Semi Pipe 3x1 - 12kg',
    'Semi Pipe 2x1 - 14kg', 'Semi Pipe 2x1 - 11kg', 'Semi Pipe 2x1 - 9kg',
    'Semi Pipe 2x2 - 18kg', 'Semi Pipe 2x2 - 14kg', 'Semi Pipe 2x2 - 12kg',
    'Semi Pipe 1.5x1.5 - 17kg', 'Semi Pipe 1.5x1.5 - 14kg', 'Semi Pipe 1.5x1.5 - 12kg', 'Semi Pipe 1.5x1.5 - 9kg',
    'Semi Pipe 1x1 - 9kg', 'Semi Pipe 1x1 - 7kg', 'Semi Pipe 1x1 - 6kg',
    'Semi Pipe 3/4x3/4 - 5kg', 'Semi Pipe 2.5x2.5 - 18kg',
    'Semi Pipe 1" Round - 7kg', 'Semi Pipe 1.25" Round - 9kg',
    'Semi Pipe 1.5" Round - 9kg', 'Semi Pipe 1.5" Round - 11kg', 'Semi Pipe 1.5" Round - 14kg', 'Semi Pipe 1.5" Round - 18kg',
    'Semi Pipe 2" Round - 14kg', 'Semi Pipe 2" Round - 17kg', 'Semi Pipe 2.5" Round - 22kg',
    'Semi Pipe 3" Round - 22kg', 'Semi Pipe 3" Round - 27kg',
  ]],
  ['ANG', 'MS Angles', [
    'MS Angle 75x6 20ft', 'MS Angle 75x5 20ft', 'MS Angle 65x6 20ft', 'MS Angle 65x5 20ft',
    'MS Angle 50x6 20ft', 'MS Angle 50x5 20ft', 'MS Angle 50x5 18ft',
    'MS Angle 40x6 20ft', 'MS Angle 40x5 20ft', 'MS Angle 40x5 18ft', 'MS Angle 40x4 20ft', 'MS Angle 40x4 18ft',
    'MS Angle 50x4 20ft', 'MS Angle 50x4 18ft', 'MS Angle 35x5 20ft', 'MS Angle 35x4 20ft',
    'MS Angle 37x3 20ft', 'MS Angle 37x3 18ft', 'MS Angle 32x3 20ft', 'MS Angle 32x3 18ft',
    'MS Angle 25x3 20ft', 'MS Angle 25x3 18ft',
  ]],
  ['PJA', 'Panjab Angles', ['Panjab Angle 2kg', 'Panjab Angle 2.5kg', 'Panjab Angle 3.3kg']],
  ['CHN', 'Channels', [
    'Channel 100x50 20ft', 'Channel 75x40 20ft', 'Channel 75x40 18ft', 'Channel 150x75 20ft', 'Channel 125x65 20ft',
    'Channel 70x35 12ft', 'Channel 70x35 14ft', 'Channel 70x35 16ft', 'Channel 70x35 18ft',
    'Channel 70x35 20ft', 'Channel 70x35 22ft', 'Channel 70x35 24ft',
  ]],
  ['IBM', 'I Beams', [
    'I Beam 4x2 12ft', 'I Beam 4x2 14ft', 'I Beam 4x2 16ft', 'I Beam 4x2 18ft', 'I Beam 4x2 20ft', 'I Beam 4x2 22ft', 'I Beam 4x2 24ft',
    'I Beam 5x2.5 14ft', 'I Beam 5x2.5 16ft', 'I Beam 5x2.5 18ft', 'I Beam 5x2.5 20ft', 'I Beam 5x2.5 22ft', 'I Beam 5x2.5 24ft',
  ]],
  ['SQB', 'Square Bars', ['Square Bar 10mm', 'Square Bar 12mm', 'Square Bar 16mm', 'Square Bar 20mm', 'Square Bar 25mm']],
  ['RDB', 'Round Bars', ['Round Bar 10mm', 'Round Bar 12mm', 'Round Bar 16mm', 'Round Bar 20mm', 'Round Bar 25mm']],
  ['FLT', 'Flats', [
    'Flat 100x12', 'Flat 75x12', 'Flat 100x6', 'Flat 75x6', 'Flat 50x12', 'Flat 40x12', 'Flat 50x10', 'Flat 50x8', 'Flat 50x6',
    'Flat 40x5', 'Flat 32x6', 'Flat 32x5', 'Flat 25x6', 'Flat 25x5', 'Flat 25x8', 'Flat 25x3', 'Flat 20x5', 'Flat 20x3',
    'Flat 12x5', 'Flat 12x3',
  ]],
  ['OTH', 'Others', ['Get Ch 21ft', 'T Angle']],
  ['TMT', 'TMT Steel', ['TMT Steel 25mm', 'TMT Steel 20mm', 'TMT Steel 16mm', 'TMT Steel 12mm', 'TMT Steel 10mm', 'TMT Steel 8mm', 'TMT Steel 6mm']],
  ['APL', 'Apollo Pipes', [
    'Apollo Pipe 6x6 - 80kg', 'Apollo Pipe 5x5 - 70kg',
    'Apollo Pipe 4x4 - 74kg', 'Apollo Pipe 4x4 - 55kg', 'Apollo Pipe 4x4 - 45kg', 'Apollo Pipe 4x4 - 38kg',
    'Apollo Pipe 3x3 - 70kg', 'Apollo Pipe 3x3 - 38kg', 'Apollo Pipe 3x3 - 27kg', 'Apollo Pipe 3x3 - 22kg',
    'Apollo Pipe 3x1.5 - 28kg', 'Apollo Pipe 3x1.5 - 22kg', 'Apollo Pipe 3x1.5 - 18kg',
    'Apollo Pipe 2x2 - 40kg', 'Apollo Pipe 2x2 - 26kg', 'Apollo Pipe 2x2 - 18kg', 'Apollo Pipe 2x2 - 15kg', 'Apollo Pipe 2x2 - 12kg',
    'Apollo Pipe 1.5x1.5 - 14kg', 'Apollo Pipe 1.5x1.5 - 12kg', 'Apollo Pipe 1.5x1.5 - 9kg', 'Apollo Pipe 1.5x1.5 - 7kg',
    'Apollo Pipe 1.25x1.25 - 9kg', 'Apollo Pipe 1.25x1.25 - 7kg',
    'Apollo Pipe 3x1 - 15kg', 'Apollo Pipe 3x1 - 12kg',
    'Apollo Pipe 2x1 - 9kg', 'Apollo Pipe 2x1 - 12kg', 'Apollo Pipe 2x1 - 14kg',
    'Apollo Pipe 1x1 - 7kg', 'Apollo Pipe 1x1 - 6kg',
    'Apollo Pipe 3/4x3/4 - 5kg', 'Apollo Pipe 3/4x3/4 - 6kg',
    'Apollo Pipe 4x2 - 38kg', 'Apollo Pipe 4x2 - 32kg', 'Apollo Pipe 4x2 - 27kg', 'Apollo Pipe 4x2 - 22kg',
    'Apollo Pipe 4" Round - 35kg', 'Apollo Pipe 3" Round - 32kg', 'Apollo Pipe 3" Round - 27kg', 'Apollo Pipe 2.5" Round - 27kg',
    'Apollo Pipe 2" Round - 15kg', 'Apollo Pipe 1.5" Round - 14kg', 'Apollo Pipe 1.5" Round - 12kg',
    'Apollo Pipe 1" Round - 12kg', 'Apollo Pipe 1" Round - 7kg',
    'Apollo Pipe 3/4" - 7kg', 'Apollo Pipe 3/4" - 6kg',
    'Apollo Pipe 1/2" Round', 'Apollo Pipe 1/2x1/2',
    'Apollo Pipe 4x1', 'Apollo Pipe 5x1', 'Apollo Pipe 6x1', 'Apollo Pipe 7x1', 'Apollo Pipe 8x1', 'Apollo Pipe 10x1',
    'Apollo Pipe 5x2.5 - 45kg', 'Apollo Pipe 6x3 - 60kg',
  ]],
  ['GPP', 'GP Pipes', [
    'GP Pipe 3x3 - 27kg', 'GP Pipe 3x3 - 22kg', 'GP Pipe 3x1.5 - 22kg', 'GP Pipe 3x1.5 - 18kg', 'GP Pipe 60x40 - 15kg',
    'GP Pipe 2x2 - 18kg', 'GP Pipe 2x2 - 15kg', 'GP Pipe 2x2 - 12kg',
    'GP Pipe 1.5x1.5 - 14kg', 'GP Pipe 1.5x1.5 - 12kg', 'GP Pipe 1.5x1.5 - 9kg',
    'GP Pipe 1x1 - 7kg', 'GP Pipe 1x1 - 6kg', 'GP Pipe 4x4 - 38kg',
  ]],
]

export const clientItems = LIST.flatMap(([prefix, category, names]) =>
  names.map((name, idx) => {
    const size = name.replace(/^(Semi Pipe|MS Angle|Panjab Angle|Channel|I Beam|Square Bar|Round Bar|Flat|TMT Steel|Apollo Pipe|GP Pipe)\s*/i, '').replace(/\s*-\s*[\d.]+kg$/i, '').trim()
    return { code: `${prefix}-${String(idx + 1).padStart(3, '0')}`, name, category, size: size === name ? '' : size, unit: 'kg' }
  }),
)
