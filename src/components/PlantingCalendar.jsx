import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { getPlantById } from '../data/plants';
import { parseLocalDate } from '../data/zones';
import { Snowflake, Sprout, Sun as SunIcon, Leaf, CloudSnow } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getPlantingDates(plant, lastFrostDate, firstFrostDate) {
  const lastFrost = new Date(lastFrostDate.getTime());
  const firstFrost = new Date(firstFrostDate.getTime());
  const dates = {};

  // Fall-planted crops (e.g. garlic)
  if (plant.plantInFall) {
    // Plant 4-6 weeks before first frost of previous year
    const plantDate = new Date(firstFrost);
    plantDate.setDate(plantDate.getDate() - 6 * 7); // 6 weeks before first frost
    dates.directSow = plantDate;
    // Harvest the following summer
    const harvestStart = new Date(lastFrost);
    harvestStart.setDate(harvestStart.getDate() + 8 * 7); // ~8 weeks after last frost
    dates.harvestStart = harvestStart;
    dates.harvestEnd = new Date(harvestStart);
    dates.harvestEnd.setDate(dates.harvestEnd.getDate() + 30);
    return dates;
  }

  // Start indoors
  if (plant.startIndoorsWeeks) {
    const start = new Date(lastFrost);
    start.setDate(start.getDate() - plant.startIndoorsWeeks * 7);
    dates.startIndoors = start;
  }

  // Transplant / direct sow
  if (plant.transplantAfterFrost !== undefined) {
    const transplant = new Date(lastFrost);
    transplant.setDate(transplant.getDate() + plant.transplantAfterFrost * 7);
    dates.transplant = transplant;
  }
  if (plant.directSowAfterFrost !== undefined) {
    const sow = new Date(lastFrost);
    sow.setDate(sow.getDate() + plant.directSowAfterFrost * 7);
    dates.directSow = sow;
  }
  if (plant.directSowWeeksBeforeFrost) {
    const sow = new Date(lastFrost);
    sow.setDate(sow.getDate() - plant.directSowWeeksBeforeFrost * 7);
    dates.directSow = sow;
  }

  // Harvest window
  const plantDate = dates.transplant || dates.directSow || lastFrost;
  const harvestStart = new Date(plantDate);
  harvestStart.setDate(harvestStart.getDate() + plant.daysToMaturity);
  dates.harvestStart = harvestStart;

  const harvestEnd = new Date(firstFrost);
  if (harvestStart < harvestEnd) {
    dates.harvestEnd = harvestEnd;
  } else {
    dates.harvestEnd = new Date(harvestStart);
    dates.harvestEnd.setDate(dates.harvestEnd.getDate() + 30);
  }

  return dates;
}

function dateToMonthFraction(date) {
  const month = date.getMonth();
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
  return month + (day - 1) / daysInMonth;
}

function TimelineBar({ start, end, color, label, className = '' }) {
  const startPos = (dateToMonthFraction(start) / 12) * 100;
  const endPos = (dateToMonthFraction(end) / 12) * 100;
  const width = Math.max(endPos - startPos, 1.5);

  return (
    <div
      className={`absolute top-0 h-full rounded-full ${className}`}
      style={{
        left: `${startPos}%`,
        width: `${width}%`,
        backgroundColor: color,
      }}
      title={label}
    />
  );
}

export default function PlantingCalendar() {
  const { state } = useStore();

  const currentYear = new Date().getFullYear();
  const lastFrostDate = state.lastFrostMMDD ? parseLocalDate(state.lastFrostMMDD, currentYear) : null;
  const firstFrostDate = state.firstFrostMMDD ? parseLocalDate(state.firstFrostMMDD, currentYear) : null;

  const plantsWithDates = useMemo(() => {
    if (!lastFrostDate || !firstFrostDate) return [];

    const plantIds = state.seedInventory.length > 0
      ? state.seedInventory.map(item => item.plantId)
      : state.plots.flatMap(p => p.plants.map(pl => pl.plantId));

    const uniqueIds = [...new Set(plantIds)];
    return uniqueIds
      .map(id => {
        const plant = getPlantById(id);
        if (!plant) return null;
        const dates = getPlantingDates(plant, lastFrostDate, firstFrostDate);
        return { plant, dates };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = a.dates.startIndoors || a.dates.directSow || a.dates.transplant;
        const bDate = b.dates.startIndoors || b.dates.directSow || b.dates.transplant;
        return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
      });
  }, [state.seedInventory, state.plots, lastFrostDate, firstFrostDate]);

  const lastFrostMonth = lastFrostDate ? dateToMonthFraction(lastFrostDate) : null;
  const firstFrostMonth = firstFrostDate ? dateToMonthFraction(firstFrostDate) : null;
  const todayMonth = dateToMonthFraction(new Date());

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-sage/10 dark:border-sage-dark/15" style={{ padding: '40px 40px 32px' }}>
        <h2 className="font-display text-2xl font-semibold text-forest-deep dark:text-cream">
          Planting Calendar
        </h2>
        <p className="text-sm text-sage-dark/70 dark:text-sage/60" style={{ marginTop: 12 }}>
          {plantsWithDates.length > 0
            ? `Timeline for ${plantsWithDates.length} plants in Zone ${state.zone}`
            : 'Add seeds to my inventory to see my planting timeline'
          }
        </p>

        {/* Legend */}
        <div className="flex items-center" style={{ gap: 24, marginTop: 24 }}>
          <span className="flex items-center text-[11px] text-sage-dark/70 dark:text-sage/60" style={{ gap: 8 }}>
            <div className="rounded-full bg-bloom-purple/80" style={{ width: 18, height: 8 }} />
            Start Indoors
          </span>
          <span className="flex items-center text-[11px] text-sage-dark/70 dark:text-sage/60" style={{ gap: 8 }}>
            <div className="rounded-full bg-sage/80" style={{ width: 18, height: 8 }} />
            Growing
          </span>
          <span className="flex items-center text-[11px] text-sage-dark/70 dark:text-sage/60" style={{ gap: 8 }}>
            <div className="rounded-full bg-terra/80" style={{ width: 18, height: 8 }} />
            Harvest
          </span>
          <span className="flex items-center text-[11px] text-sage-dark/70 dark:text-sage/60" style={{ gap: 8 }}>
            <Snowflake className="w-3.5 h-3.5 text-bloom-blue/70" />
            Frost Dates
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-w-[800px]">
          {/* Month headers */}
          <div className="sticky top-0 z-10 bg-cream/95 dark:bg-midnight/95 backdrop-blur-sm border-b border-sage/10 dark:border-sage-dark/15">
            <div className="flex">
              <div className="w-52 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-sage-dark/60 dark:text-sage/50" style={{ padding: '18px 24px' }}>
                Plant
              </div>
              <div className="flex-1 flex relative">
                {MONTHS.map((m, i) => (
                  <div
                    key={m}
                    className="flex-1 text-center text-[10px] font-medium text-sage-dark/60 dark:text-sage/50 border-l border-sage/8 dark:border-sage-dark/12"
                    style={{ padding: '14px 0' }}
                  >
                    {m}
                  </div>
                ))}
                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-terra z-30"
                  style={{ left: `${(todayMonth / 12) * 100}%` }}
                  title="Today"
                >
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-terra text-cream text-[7px] font-bold px-1.5 py-px rounded">
                    TODAY
                  </div>
                </div>
                {/* Frost indicators */}
                {lastFrostMonth !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-bloom-blue/60 z-20"
                    style={{ left: `${(lastFrostMonth / 12) * 100}%` }}
                    title="Last Frost"
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                      <Snowflake className="w-3 h-3 text-bloom-blue" />
                    </div>
                  </div>
                )}
                {firstFrostMonth !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-bloom-blue/60 z-20"
                    style={{ left: `${(firstFrostMonth / 12) * 100}%` }}
                    title="First Frost"
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2">
                      <CloudSnow className="w-3 h-3 text-bloom-blue" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plant rows */}
          {plantsWithDates.map(({ plant, dates }, i) => (
            <motion.div
              key={plant.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              className="flex items-center border-b border-sage/5 dark:border-sage-dark/8 hover:bg-sage/4 dark:hover:bg-sage/4 transition-colors group"
            >
              {/* Plant name */}
              <div className="w-52 shrink-0 flex items-center" style={{ padding: '16px 24px', gap: 14 }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ backgroundColor: (plant.color || '#8B9E7E') + '15' }}>
                  {plant.emoji}
                </div>
                <div>
                  <div className="text-sm font-medium text-forest-deep dark:text-cream leading-tight">
                    {plant.name}
                  </div>
                  <div className="text-[10px] text-sage-dark/60 dark:text-sage/50 mt-0.5">
                    {plant.daysToMaturity}d to harvest
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 relative h-12">
                {/* Month grid lines */}
                <div className="absolute inset-0 flex">
                  {MONTHS.map((m, i) => (
                    <div key={i} className="flex-1 border-l border-sage/5 dark:border-sage-dark/10" />
                  ))}
                </div>

                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-terra/50 z-10"
                  style={{ left: `${(todayMonth / 12) * 100}%` }}
                />
                {/* Frost lines */}
                {lastFrostMonth !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-bloom-blue/30"
                    style={{ left: `${(lastFrostMonth / 12) * 100}%` }}
                  />
                )}
                {firstFrostMonth !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-bloom-blue/30"
                    style={{ left: `${(firstFrostMonth / 12) * 100}%` }}
                  />
                )}

                {/* Start indoors bar */}
                {dates.startIndoors && dates.transplant && (
                  <div className="absolute left-0 right-0 top-1 h-3">
                    <TimelineBar
                      start={dates.startIndoors}
                      end={dates.transplant}
                      color="#8B6AAE"
                      label="Start indoors"
                      className="opacity-80"
                    />
                  </div>
                )}

                {/* Transplant / direct sow bar */}
                {(dates.transplant || dates.directSow) && dates.harvestStart && (
                  <div className="absolute left-0 right-0 top-1 h-3">
                    <TimelineBar
                      start={dates.transplant || dates.directSow}
                      end={dates.harvestStart}
                      color="#8B9E7E"
                      label="Growing"
                      className="opacity-70"
                    />
                  </div>
                )}

                {/* Harvest bar */}
                {dates.harvestStart && dates.harvestEnd && (
                  <div className="absolute left-0 right-0 top-5 h-3">
                    <TimelineBar
                      start={dates.harvestStart}
                      end={dates.harvestEnd}
                      color="#C17644"
                      label="Harvest"
                      className="opacity-80"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {plantsWithDates.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-sage/8 dark:bg-sage/12 flex items-center justify-center mx-auto mb-4">
                <Sprout className="w-8 h-8 text-sage/30" />
              </div>
              <p className="font-display text-xl text-sage-dark/50 dark:text-sage/40">No plants to schedule yet</p>
              <p className="text-sm mt-1.5 text-sage-dark/35 dark:text-sage/25">
                Add seeds to my inventory or place plants in my garden
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
