// Common garden plant varieties with specific details
// Keys are plantId, values are maps of variety name (lowercase) → details

const VARIETIES = {
  tomato: {
    'cherokee purple': { daysToMaturity: 80, type: 'indeterminate', color: 'Dark purple', size: 'Large (10-12oz)', notes: 'Heirloom. Rich, sweet, complex flavor. Excellent slicing tomato.' },
    'brandywine': { daysToMaturity: 85, type: 'indeterminate', color: 'Pink-red', size: 'Large (12-16oz)', notes: 'Heirloom. Classic old-fashioned tomato flavor. Low yields but incredible taste.' },
    'san marzano': { daysToMaturity: 78, type: 'indeterminate', color: 'Red', size: 'Medium paste', notes: 'Classic Italian paste tomato. Low moisture, few seeds. Best for sauces.' },
    'roma': { daysToMaturity: 75, type: 'determinate', color: 'Red', size: 'Medium paste (3oz)', notes: 'Reliable paste tomato. Thick walls, meaty flesh. Great for canning and sauces.' },
    'sweet 100': { daysToMaturity: 65, type: 'indeterminate', color: 'Red', size: 'Cherry', notes: 'Prolific cherry tomato. Extremely sweet. Long trusses of 100+ fruits.' },
    'sun gold': { daysToMaturity: 60, type: 'indeterminate', color: 'Golden orange', size: 'Cherry', notes: 'Tropical-sweet flavor. One of the best cherry tomatoes. Highly productive.' },
    'better boy': { daysToMaturity: 72, type: 'indeterminate', color: 'Red', size: 'Large (8-12oz)', notes: 'Hybrid. Reliable, disease-resistant. Good all-purpose tomato.' },
    'early girl': { daysToMaturity: 57, type: 'indeterminate', color: 'Red', size: 'Medium (4-6oz)', notes: 'One of the earliest slicers. Good flavor for an early variety.' },
    'black krim': { daysToMaturity: 80, type: 'indeterminate', color: 'Dark red-brown', size: 'Large (8-12oz)', notes: 'Russian heirloom. Smoky, salty-sweet flavor. Beautiful dark color.' },
    'mortgage lifter': { daysToMaturity: 85, type: 'indeterminate', color: 'Pink', size: 'Very large (1-2lb)', notes: 'Heirloom beefsteak. Mild, sweet flavor. Few seeds.' },
    'celebrity': { daysToMaturity: 70, type: 'semi-determinate', color: 'Red', size: 'Medium (7-8oz)', notes: 'All-America Selection winner. Disease resistant, reliable producer.' },
    'grape': { daysToMaturity: 60, type: 'indeterminate', color: 'Red', size: 'Grape', notes: 'Oblong cherry type. Crack-resistant, great for snacking and salads.' },
    'beefsteak': { daysToMaturity: 80, type: 'indeterminate', color: 'Red', size: 'Very large (1-2lb)', notes: 'Classic large slicing tomato. Meaty, great for sandwiches.' },
    'juliet': { daysToMaturity: 60, type: 'indeterminate', color: 'Red', size: 'Grape-plum', notes: 'Crack-resistant grape tomato. Sweet, heavy yields. Good disease resistance.' },
    'yellow pear': { daysToMaturity: 70, type: 'indeterminate', color: 'Yellow', size: 'Small pear-shaped', notes: 'Heirloom. Mild, sweet flavor. Prolific producer. Great in salads.' },
    'green zebra': { daysToMaturity: 75, type: 'indeterminate', color: 'Green with yellow stripes', size: 'Medium (3-4oz)', notes: 'Tangy, zingy flavor. Stays green when ripe with yellow stripes.' },
    'amish paste': { daysToMaturity: 80, type: 'indeterminate', color: 'Red', size: 'Large paste (8oz)', notes: 'Heirloom. Excellent for sauce, juice, and fresh eating. Oxheart shape. Seed Savers Exchange.' },
    'german pink': { daysToMaturity: 80, type: 'indeterminate', color: 'Pink', size: 'Large beefsteak (1-2lb)', notes: 'Seed Savers heirloom. Meaty, few seeds, sweet flavor. Bavarian origin. Excellent slicer.' },
    'eva purple ball': { daysToMaturity: 70, type: 'indeterminate', color: 'Purple-pink', size: 'Medium (4-5oz)', notes: 'Seed Savers heirloom. Smooth, crack-resistant. Sweet and rich. German Black Forest origin.' },
    'black cherry': { daysToMaturity: 65, type: 'indeterminate', color: 'Dark purple-brown', size: 'Cherry (1oz)', notes: 'Seed Savers heirloom. Rich, complex, smoky-sweet flavor. Gorgeous in salads.' },
  },
  'pepper-bell': {
    'california wonder': { daysToMaturity: 75, color: 'Green to red', size: 'Large (4-lobed)', notes: 'Classic sweet pepper. Thick walls, blocky shape. Reliable producer.' },
    'sweet banana': { daysToMaturity: 70, color: 'Yellow to red', size: 'Long (6-8")', notes: 'Sweet, mild flavor. Great for frying, pickling, or fresh.' },
    'jalapeño': { daysToMaturity: 72, color: 'Green to red', size: 'Medium (3")', heat: 'Medium (2,500-8,000 SHU)', notes: 'Classic hot pepper. Versatile in cooking. Thick-walled.' },
    'habanero': { daysToMaturity: 90, color: 'Green to orange', size: 'Small (2")', heat: 'Very hot (100,000-350,000 SHU)', notes: 'Fruity, intense heat. Use sparingly. Prolific in warm climates.' },
    'cayenne': { daysToMaturity: 70, color: 'Green to red', size: 'Long thin (6")', heat: 'Hot (30,000-50,000 SHU)', notes: 'Great for drying and grinding. Thin walls dry easily.' },
    'poblano': { daysToMaturity: 75, color: 'Dark green', size: 'Large (4-6")', heat: 'Mild (1,000-2,000 SHU)', notes: 'Mild heat, rich flavor. Essential for chiles rellenos. Called ancho when dried.' },
    'serrano': { daysToMaturity: 75, color: 'Green to red', size: 'Small (2-3")', heat: 'Hot (10,000-25,000 SHU)', notes: 'Hotter than jalapeño. Crisp, bright flavor. Great in salsas.' },
    'shishito': { daysToMaturity: 60, color: 'Green', size: 'Small (3-4")', heat: 'Mild (50-200 SHU)', notes: 'Japanese pepper. Blister in a hot pan with oil and salt. 1 in 10 is spicy!' },
    'anaheim': { daysToMaturity: 77, color: 'Green to red', size: 'Long (6-8")', heat: 'Mild (500-2,500 SHU)', notes: 'Mild, versatile. Good for stuffing, roasting, and green chile dishes.' },
    'thai': { daysToMaturity: 70, color: 'Green to red', size: 'Tiny (1-2")', heat: 'Very hot (50,000-100,000 SHU)', notes: 'Small but fiery. Essential for Thai and Southeast Asian cooking.' },
    'lunchbox': { daysToMaturity: 60, color: 'Red/orange/yellow', size: 'Snack-size', notes: 'Sweet mini peppers. Perfect for kids and snacking. Very productive.' },
    'jimmy nardello': { daysToMaturity: 75, color: 'Red', size: 'Long (8-10")', notes: 'Italian heirloom frying pepper. Incredibly sweet when fried in olive oil.' },
    'padron': { daysToMaturity: 60, color: 'Green', size: 'Small (2-3")', heat: 'Mild to medium', notes: 'Spanish tapas pepper. Mostly mild, occasionally hot. Blister and salt.' },
    'bull nose': { daysToMaturity: 70, color: 'Green to red', size: 'Large (3-4")', notes: 'Seed Savers heirloom. One of the oldest American peppers, grown since 1759. Sweet, thick-walled, blocky. Excellent stuffing pepper.' },
  },
  basil: {
    'genovese': { daysToMaturity: 60, notes: 'Classic Italian basil. Large, cupped leaves. The gold standard for pesto.' },
    'sweet': { daysToMaturity: 60, notes: 'All-purpose cooking basil. Slightly smaller leaves than Genovese.' },
    'thai': { daysToMaturity: 60, notes: 'Anise/licorice flavor. Sturdy stems with purple flowers. Essential for Thai cuisine.' },
    'purple': { daysToMaturity: 65, notes: 'Deep purple leaves. Milder flavor. Beautiful garnish and in salads.' },
    'lemon': { daysToMaturity: 60, notes: 'Bright citrus aroma. Great in teas, fish dishes, and desserts.' },
    'holy': { daysToMaturity: 65, notes: 'Sacred in Hindu tradition (Tulsi). Peppery, clove-like flavor. Medicinal tea.' },
    'cinnamon': { daysToMaturity: 60, notes: 'Warm cinnamon aroma. Unique in baked goods and fruit salads.' },
  },
  lettuce: {
    'buttercrunch': { daysToMaturity: 55, notes: 'Butterhead type. Tender, sweet leaves. Heat tolerant. AAS winner.' },
    'romaine': { daysToMaturity: 65, notes: 'Upright, crisp heads. Classic for Caesar salads. Good heat tolerance.' },
    'red leaf': { daysToMaturity: 45, notes: 'Loose-leaf, red-tinged. Mild flavor. Easy and fast to grow.' },
    'iceberg': { daysToMaturity: 70, notes: 'Crisp, mild heads. Needs cool weather. Satisfying crunch.' },
    'arugula': { daysToMaturity: 35, notes: 'Peppery, nutty flavor. Very fast growing. Great in salads and on pizza.' },
    'mesclun mix': { daysToMaturity: 40, notes: 'Mix of baby greens. Cut-and-come-again harvest. Easy for beginners.' },
    'black seeded simpson': { daysToMaturity: 45, notes: 'Heirloom loose-leaf. Light green, ruffled. Very easy to grow.' },
  },
  cucumber: {
    'marketmore': { daysToMaturity: 65, notes: 'Classic dark green slicer. Bitter-free. Disease resistant. Reliable.' },
    'boston pickling': { daysToMaturity: 55, notes: 'Prolific pickling cucumber. Pick small for cornichons or larger for dills.' },
    'lemon': { daysToMaturity: 60, notes: 'Round, yellow, mild. Unique appearance. Never bitter. Great fresh.' },
    'english': { daysToMaturity: 60, notes: 'Long, seedless, thin-skinned. No peeling needed. Best in greenhouse.' },
    'spacemaster': { daysToMaturity: 60, notes: 'Compact bush type. Perfect for containers. Full-size cukes on small plants.' },
    'straight eight': { daysToMaturity: 60, notes: 'Heirloom. Uniform 8" fruits. Good all-around slicer.' },
  },
  'squash-zucchini': {
    'black beauty': { daysToMaturity: 50, notes: 'Classic dark green zucchini. Very productive. Pick young for best flavor.' },
    'golden': { daysToMaturity: 50, notes: 'Bright yellow zucchini. Same great taste, beautiful color.' },
    'costata romanesco': { daysToMaturity: 55, notes: 'Italian heirloom. Ribbed, nutty flavor. Best when picked at 6-8".' },
    'pattypan': { daysToMaturity: 50, notes: 'Scallop-shaped summer squash. Fun shape, tender flesh. Pick young.' },
    'butternut': { daysToMaturity: 100, notes: 'Winter squash. Sweet, nutty flesh. Stores for months. Great roasted.' },
    'spaghetti': { daysToMaturity: 90, notes: 'Winter squash. Flesh separates into spaghetti-like strands when cooked.' },
    'acorn': { daysToMaturity: 85, notes: 'Winter squash. Sweet, slightly nutty. Perfect stuffed and baked.' },
    'delicata': { daysToMaturity: 80, notes: 'Winter squash. Edible skin! Sweet, creamy. Easy to prepare.' },
  },
  'bean-green': {
    'blue lake': { daysToMaturity: 55, notes: 'Classic green bean. Tender, stringless pods. Heavy yields. Bush type.' },
    'kentucky wonder': { daysToMaturity: 65, notes: 'Pole bean heirloom. Long, flavorful pods. Great fresh or dried.' },
    'provider': { daysToMaturity: 50, notes: 'Extra early bush bean. Cold tolerant. Reliable even in poor conditions.' },
    'dragon tongue': { daysToMaturity: 60, notes: 'Beautiful yellow pods with purple streaks. Dual-purpose: fresh or dried.' },
    'royal burgundy': { daysToMaturity: 55, notes: 'Purple pods turn green when cooked. Fun for kids. Good cold tolerance.' },
  },
  carrot: {
    'nantes': { daysToMaturity: 65, notes: 'Sweet, cylindrical roots. Nearly coreless. Great in heavy soil.' },
    'danvers': { daysToMaturity: 70, notes: 'Classic pointed carrot. Good in clay soil. Stores well.' },
    'cosmic purple': { daysToMaturity: 70, notes: 'Purple exterior, orange interior. Sweet, earthy flavor. Stunning.' },
    'thumbelina': { daysToMaturity: 60, notes: 'Round, golf-ball sized. Perfect for containers and heavy soil.' },
    'scarlet nantes': { daysToMaturity: 68, notes: 'Bright orange, sweet, nearly coreless. One of the best-tasting carrots.' },
    'rainbow mix': { daysToMaturity: 70, notes: 'Mix of purple, orange, yellow, white, and red varieties.' },
  },
  'herb-cilantro': {
    'santo': { daysToMaturity: 50, notes: 'Slow-bolt variety. More leaf harvest before flowering. Good for warm climates.' },
    'calypso': { daysToMaturity: 50, notes: 'Very slow to bolt. Extended harvest period. Good flavor.' },
    'leisure': { daysToMaturity: 50, notes: 'Slow-bolting. Large, flavorful leaves. Best for leaf production.' },
  },
  'herb-dill': {
    'bouquet': { daysToMaturity: 50, notes: 'Compact variety. Great for containers. Good leaf and seed production.' },
    'fernleaf': { daysToMaturity: 45, notes: 'Dwarf variety, 18" tall. Slow to bolt. Excellent for containers.' },
    'mammoth': { daysToMaturity: 55, notes: 'Tall variety (3-4ft). Large seed heads. Best for pickling.' },
  },
  'flower-sunflower': {
    'mammoth': { daysToMaturity: 80, notes: 'Classic giant. 10-12ft tall. Huge seed heads. Great for kids.' },
    'teddy bear': { daysToMaturity: 65, notes: 'Dwarf (2-3ft). Fluffy double flowers. Perfect for containers.' },
    'autumn beauty': { daysToMaturity: 70, notes: 'Mix of warm colors: red, bronze, yellow, gold. Multi-branching.' },
    'velvet queen': { daysToMaturity: 70, notes: 'Deep mahogany-red petals. 5-6ft tall. Stunning cut flower.' },
    'lemon queen': { daysToMaturity: 75, notes: 'Pale yellow petals. Excellent pollinator magnet. 5-6ft tall.' },
  },
  'flower-zinnia': {
    'giant dahlia': { daysToMaturity: 75, notes: 'Large (4-5") double flowers. Mix of bright colors. Great for cutting.' },
    'profusion': { daysToMaturity: 55, notes: 'Compact, disease-resistant. Non-stop blooms. Low maintenance.' },
    'queen lime': { daysToMaturity: 70, notes: 'Unusual lime-green blooms aging to rose. Sophisticated cut flower.' },
    'benary giant': { daysToMaturity: 75, notes: 'Premium cut flower. 4-5" fully double blooms. Long stems.' },
    'oklahoma': { daysToMaturity: 70, notes: 'Mix of warm, hot colors. Semi-double blooms. Great border plant.' },
  },

  // Corn varieties
  corn: {
    'golden bantam': { daysToMaturity: 78, color: 'Golden yellow', notes: 'Seed Savers heirloom. The original sweet corn from 1902. Rich, old-fashioned corn flavor. 5-6ft stalks.' },
    'stowell\'s evergreen': { daysToMaturity: 95, color: 'White', notes: 'Heirloom since 1848. White kernels, sweet flavor. Stays tender longer than most. 7-8ft stalks.' },
    'country gentleman': { daysToMaturity: 93, color: 'White', notes: 'Heirloom shoepeg corn. Irregular kernel rows. Excellent creamy sweet flavor. 7-8ft.' },
    'peaches and cream': { daysToMaturity: 72, color: 'Bi-color', notes: 'Popular hybrid. Sweet, tender. Mix of white and yellow kernels. 6ft stalks.' },
    'silver queen': { daysToMaturity: 92, color: 'White', notes: 'Classic white sweet corn. Very sweet, tender. Late season. 8ft stalks.' },
    'honey select': { daysToMaturity: 79, color: 'Yellow', notes: 'Triple-sweet hybrid. Tender, sweet, holds well on stalk. Good disease resistance.' },
    'blue hopi': { daysToMaturity: 100, color: 'Blue-purple', notes: 'Ancient Native American variety. Stunning blue kernels. Flour/grinding corn. Drought tolerant.' },
    'glass gem': { daysToMaturity: 110, color: 'Multi-color (rainbow)', notes: 'Gorgeous translucent rainbow kernels. Ornamental/popcorn. Cherokee heritage. Absolutely stunning.' },
    'bloody butcher': { daysToMaturity: 100, color: 'Deep red', notes: 'Seed Savers heirloom. Blood-red dent corn. Makes beautiful red cornmeal. 10-12ft stalks.' },
    'oaxacan green': { daysToMaturity: 95, color: 'Green', notes: 'Seed Savers heirloom. Rare green dent corn from Mexico. Makes green-tinted masa and tamales.' },
    'luther hill': { daysToMaturity: 78, color: 'White', notes: 'Seed Savers heirloom. Small 4-5ft plants. Sweet white ears. Great for small gardens.' },
    'japanese hulless': { daysToMaturity: 100, color: 'White', notes: 'Popcorn variety. Nearly hulless when popped. Tender, few shells stuck in teeth.' },
    'strawberry': { daysToMaturity: 100, color: 'Mahogany red', size: 'Tiny (2-3")', notes: 'Ornamental popcorn. Tiny strawberry-shaped ears. Fun for kids. Actually pops well.' },
    'reid\'s yellow dent': { daysToMaturity: 110, color: 'Yellow', notes: 'Historic 1847 field corn. Parent of many modern hybrids. Grinding/flour corn.' },
    'hjerleid blue': { daysToMaturity: 90, color: 'Blue', notes: 'Seed Savers heirloom. Beautiful blue flour corn from the Hjerleid family of North Dakota. Makes stunning blue cornmeal.' },
  },

  // Pea varieties
  pea: {
    'amish snap': { daysToMaturity: 60, type: 'vine (5-6ft)', notes: 'Seed Savers heirloom. Productive snap pea. Sweet, crunchy pods. Needs trellising. Amish origin.' },
    'sugar snap': { daysToMaturity: 62, type: 'vine (5-6ft)', notes: 'Classic snap pea. Eat pod and all. Sweet, crisp. The original snap pea variety.' },
    'sugar ann': { daysToMaturity: 52, type: 'bush (2ft)', notes: 'Early bush snap pea. No trellis needed. Sweet pods. Great for small spaces.' },
    'oregon sugar pod': { daysToMaturity: 60, type: 'vine (3ft)', notes: 'Snow pea. Flat, tender pods for stir-fry. Short vines. Productive.' },
    'green arrow': { daysToMaturity: 68, type: 'vine (2-3ft)', notes: 'English shelling pea. Double pods, high yields. Sweet, classic pea flavor.' },
    'little marvel': { daysToMaturity: 60, type: 'bush (18")', notes: 'Compact shelling pea. Sweet, tender. Great for small gardens and containers.' },
    'wando': { daysToMaturity: 68, type: 'vine (2-3ft)', notes: 'Heat-tolerant shelling pea. Can plant later than most peas. Reliable.' },
    'mammoth melting sugar': { daysToMaturity: 68, type: 'vine (4-5ft)', notes: 'Giant snow pea. 4-5" flat pods. Sweet, tender. Needs trellis.' },
    'blue podded': { daysToMaturity: 70, type: 'vine (6ft)', notes: 'Stunning purple pods with green peas inside. Shelling type. Beautiful and delicious.' },
    'tom thumb': { daysToMaturity: 55, type: 'bush (8-10")', notes: 'Tiny heirloom. Perfect for containers and windowsills. Shelling type.' },
  },

  // Seed Savers Exchange varieties — beans
  'bean-green': {
    'blue lake': { daysToMaturity: 55, notes: 'Classic green bean. Tender, stringless pods. Heavy yields. Bush type.' },
    'kentucky wonder': { daysToMaturity: 65, notes: 'Pole bean heirloom. Long, flavorful pods. Great fresh or dried.' },
    'provider': { daysToMaturity: 50, notes: 'Extra early bush bean. Cold tolerant. Reliable even in poor conditions.' },
    'dragon tongue': { daysToMaturity: 60, notes: 'Beautiful yellow pods with purple streaks. Dual-purpose: fresh or dried.' },
    'royal burgundy': { daysToMaturity: 55, notes: 'Purple pods turn green when cooked. Fun for kids. Good cold tolerance.' },
    'christmas lima': { daysToMaturity: 85, type: 'pole', notes: 'Seed Savers heirloom. Beautiful maroon-splashed white beans. Chestnut-like flavor. Pole bean.' },
    'hidatsa red': { daysToMaturity: 90, type: 'pole', notes: 'Seed Savers heirloom. Deep red dry bean from the Hidatsa people of North Dakota. Rich, earthy flavor.' },
    'turkey craw': { daysToMaturity: 75, type: 'pole', notes: 'Seed Savers heirloom. Appalachian heritage bean. Buff with dark markings. Excellent flavor fresh or dried.' },
  },

  // Seed Savers Exchange — beet
  beet: {
    'detroit dark red': { daysToMaturity: 60, color: 'Deep red', notes: 'Seed Savers heirloom. Classic beet. Smooth, round, deep red. Sweet, tender. Great for roasting and canning.' },
    'chioggia': { daysToMaturity: 55, color: 'Red and white rings', notes: 'Italian heirloom. Stunning candy-striped interior. Sweet, mild flavor. Beautiful raw in salads.' },
    'golden': { daysToMaturity: 55, color: 'Golden yellow', notes: "Doesn't bleed like red beets. Sweet, mild. Beautiful roasted. Greens are excellent." },
    'bull\'s blood': { daysToMaturity: 55, color: 'Deep red', notes: 'Grown for its stunning dark red leaves. Baby greens are gorgeous in salads.' },
  },

  // Seed Savers Exchange — cucumber
  cucumber: {
    'marketmore': { daysToMaturity: 65, notes: 'Classic dark green slicer. Bitter-free. Disease resistant. Reliable.' },
    'boston pickling': { daysToMaturity: 55, notes: 'Prolific pickling cucumber. Pick small for cornichons or larger for dills.' },
    'lemon': { daysToMaturity: 60, notes: 'Round, yellow, mild. Unique appearance. Never bitter. Great fresh.' },
    'english': { daysToMaturity: 60, notes: 'Long, seedless, thin-skinned. No peeling needed. Best in greenhouse.' },
    'spacemaster': { daysToMaturity: 60, notes: 'Compact bush type. Perfect for containers. Full-size cukes on small plants.' },
    'russian pickling': { daysToMaturity: 50, notes: 'Seed Savers heirloom. Small, prolific pickler. Crisp, thin-skinned. Excellent for fermented pickles.' },
  },

  // Seed Savers Exchange — onion
  onion: {
    'yellow of parma': { daysToMaturity: 110, color: 'Yellow', notes: 'Seed Savers heirloom. Large, flat Italian cipollini type. Sweet, mild. Excellent keeper and for caramelizing.' },
    'walla walla': { daysToMaturity: 115, color: 'Yellow', notes: 'Famous sweet onion. Mild enough to eat raw. Large bulbs. Short storage.' },
    'red burgundy': { daysToMaturity: 95, color: 'Red-purple', notes: 'Mild, sweet red onion. Beautiful in salads and on burgers.' },
  },

  // Seed Savers Exchange — celery/celeriac
  celery: {
    'tall utah': { daysToMaturity: 100, notes: 'Seed Savers heirloom. Classic celery. Tall, crisp stalks. Rich celery flavor. Needs consistent moisture.' },
    'giant prague': { daysToMaturity: 110, notes: 'Seed Savers heirloom. Celeriac (celery root). Large, knobby root with intense celery flavor. Great roasted or in soups.' },
  },

  // Seed Savers Exchange — flowers
  'flower-marigold': {
    'red marietta': { daysToMaturity: 55, notes: 'Seed Savers heirloom. French marigold. Deep red with gold edges. Compact. Great companion plant — deters pests.' },
    'crackerjack': { daysToMaturity: 60, notes: 'African marigold mix. Large 3-4" pompom blooms. Yellow, orange, gold.' },
  },
  'flower-nasturtium': {
    'empress of india': { daysToMaturity: 50, notes: 'Seed Savers heirloom. Compact mounding habit. Scarlet-red flowers over dark blue-green foliage. Edible flowers and leaves.' },
    'jewel mix': { daysToMaturity: 50, notes: 'Mix of warm colors. Semi-trailing. Edible flowers with peppery flavor.' },
  },
  'flower-morning-glory': {
    'grandpa ott\'s': { daysToMaturity: 70, notes: 'Seed Savers signature heirloom. Deep royal purple with crimson star. Vigorous climber. The variety that started Seed Savers Exchange.' },
    'heavenly blue': { daysToMaturity: 70, notes: 'Classic sky-blue morning glory. 5" blooms. Vigorous to 12ft.' },
  },
  'flower-poppy': {
    'chima family heirloom': { daysToMaturity: 70, notes: 'Seed Savers heirloom. Stunning double blooms. Self-sowing annual. Beautiful in cottage gardens.' },
    'lauren\'s grape': { daysToMaturity: 65, notes: 'Deep grape-purple single blooms. Self-sows freely. Striking color.' },
  },
  'black-cumin': {
    'nigella sativa': { daysToMaturity: 90, notes: 'True black cumin/kalonji. Delicate blue-white flowers. Seeds have peppery, oniony flavor. Used in Indian, Middle Eastern cooking.' },
    'love-in-a-mist': { daysToMaturity: 65, notes: 'Nigella damascena. Ornamental cousin. Feathery foliage, blue flowers, dramatic seed pods. Self-sows. Seeds are not culinary.' },
  },
  'forget-me-not': {
    'blue ball': { daysToMaturity: 60, color: 'Blue', notes: 'Compact mounds of true blue flowers. 6-8" tall. Great edging plant.' },
    'victoria blue': { daysToMaturity: 55, color: 'Deep blue', notes: 'Intense blue. Compact and uniform. Excellent for borders and containers.' },
    'victoria rose': { daysToMaturity: 55, color: 'Pink', notes: 'Soft pink version. Lovely paired with blue varieties.' },
    'white': { daysToMaturity: 60, color: 'White', notes: 'Pure white blooms. Beautiful in moon gardens and mixed with blue varieties.' },
    'chinese': { daysToMaturity: 70, color: 'Blue', notes: 'Cynoglossum. Taller (18-24"). Deeper blue. More drought tolerant than true forget-me-nots.' },
  },
  flax: {
    'linore': { daysToMaturity: 90, notes: 'Seed Savers heirloom. Delicate blue flowers on slender stems. Ornamental annual flax. Lovely in wildflower meadows.' },
  },
  'ornamental-grass': {
    'bunny tails': { daysToMaturity: 65, notes: 'Seed Savers. Lagurus ovatus. Soft, fluffy white seed heads. Adorable in arrangements. 12-18" tall.' },
  },
  raspberry: {
    'heritage': { daysToMaturity: 365, color: 'Red', notes: 'Everbearing. Two harvests per season. Very hardy and disease resistant.' },
    'autumn bliss': { daysToMaturity: 365, color: 'Red', notes: 'Everbearing. Large berries, excellent flavor. Good for northern climates.' },
    'anne': { daysToMaturity: 365, color: 'Golden yellow', notes: 'Everbearing yellow. Sweet, mild flavor. Less attractive to birds.' },
    'jewel': { daysToMaturity: 365, color: 'Black', notes: 'Black raspberry. Intensely flavored. Great for jams and fresh eating.' },
  },
  blueberry: {
    'top hat': { daysToMaturity: 365, color: 'Blue-black', notes: 'Dwarf highbush. Compact 18-24" plant, perfect for containers. Self-pollinating. Heavy yields for its size.' },
    'bluecrop': { daysToMaturity: 365, color: 'Large blue', notes: 'Most widely planted variety. Reliable, productive. 4-6 ft tall.' },
    'duke': { daysToMaturity: 365, color: 'Light blue', notes: 'Early season. Large firm berries. Vigorous grower.' },
  },
  rhubarb: {
    'victoria': { daysToMaturity: 365, color: 'Green-red stalks', notes: 'Classic heirloom. Reliable, vigorous. Tart flavor perfect for pies.' },
    'crimson red': { daysToMaturity: 365, color: 'Deep red stalks', notes: 'Sweeter than Victoria. Beautiful deep red color.' },
  },
  sorrel: {
    'french': { daysToMaturity: 60, notes: 'Rumex scutatus. Milder, rounder leaves than common sorrel. Classic French cuisine.' },
    'red veined': { daysToMaturity: 60, color: 'Green with red veins', notes: 'Striking ornamental and culinary. Slightly milder lemony flavor.' },
  },
};

// Fuzzy match: try exact, then try partial match
export function lookupVariety(plantId, varietyName) {
  if (!varietyName || !VARIETIES[plantId]) return null;
  const varieties = VARIETIES[plantId];
  const key = varietyName.toLowerCase().trim();

  // Exact match
  if (varieties[key]) return { ...varieties[key], matched: key };

  // Partial match — variety name contains or is contained by a known variety
  for (const [name, data] of Object.entries(varieties)) {
    if (key.includes(name) || name.includes(key)) {
      return { ...data, matched: name };
    }
  }

  return null;
}

// Get all known varieties for a plant
export function getVarietiesForPlant(plantId) {
  if (!VARIETIES[plantId]) return [];
  return Object.entries(VARIETIES[plantId]).map(([name, data]) => ({
    name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    ...data,
  }));
}
