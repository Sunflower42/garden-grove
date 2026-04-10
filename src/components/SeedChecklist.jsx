import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { getPlantById } from '../data/plants';
import { parseLocalDate } from '../data/zones';
import { Printer, X, CheckSquare, CheckCheck } from 'lucide-react';

function getPlantingDates(plant, lastFrostDate, firstFrostDate) {
  const lastFrost = new Date(lastFrostDate.getTime());
  const firstFrost = new Date(firstFrostDate.getTime());
  const dates = {};

  if (plant.plantInFall) {
    const plantDate = new Date(firstFrost);
    plantDate.setDate(plantDate.getDate() - 6 * 7);
    dates.directSow = plantDate;
    dates.action = 'Plant outdoors';
    return dates;
  }

  if (plant.startIndoorsWeeks) {
    const start = new Date(lastFrost);
    start.setDate(start.getDate() - plant.startIndoorsWeeks * 7);
    dates.startIndoors = start;
  }

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

  return dates;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function SeedChecklist({ onClose }) {
  const { state, dispatch } = useStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  const lastFrostDate = state.lastFrostMMDD ? parseLocalDate(state.lastFrostMMDD, currentYear) : null;
  const firstFrostDate = state.firstFrostMMDD ? parseLocalDate(state.firstFrostMMDD, currentYear) : null;

  const checklistItems = useMemo(() => {
    if (!lastFrostDate || !firstFrostDate) return [];

    // Build from inventory items when available, so we can track started per-item
    const invItems = state.seedInventory.length > 0
      ? state.seedInventory
      : state.plots.flatMap(p => p.plants.map(pl => ({ id: pl.id, plantId: pl.plantId })));

    // Dedupe by plantId but keep inventory ids for toggle
    const seen = new Set();
    const items = [];

    for (const inv of invItems) {
      if (seen.has(inv.plantId)) continue;
      seen.add(inv.plantId);
      const plant = getPlantById(inv.plantId);
      if (!plant) continue;
      const dates = getPlantingDates(plant, lastFrostDate, firstFrostDate);

      const variety = inv.variety || '';

      // Start indoors task
      if (dates.startIndoors && dates.startIndoors <= today) {
        items.push({
          plant,
          variety,
          invId: inv.id,
          started: !!inv.started,
          action: 'Start indoors',
          date: dates.startIndoors,
          nextStep: dates.transplant ? `Transplant ${formatDate(dates.transplant)}` : null,
          overdue: dates.startIndoors < today && !inv.started,
          sortDate: dates.startIndoors,
        });
      }

      // Direct sow task
      if (dates.directSow && dates.directSow <= today) {
        items.push({
          plant,
          variety,
          invId: inv.id,
          started: !!inv.started,
          action: plant.plantInFall ? 'Plant outdoors' : 'Direct sow',
          date: dates.directSow,
          nextStep: null,
          overdue: dates.directSow < today && !inv.started,
          sortDate: dates.directSow,
        });
      }
    }

    // Sort: not-started first, then by date
    items.sort((a, b) => {
      if (a.started !== b.started) return a.started ? 1 : -1;
      return a.sortDate.getTime() - b.sortDate.getTime();
    });
    return items;
  }, [state.seedInventory, state.plots, lastFrostDate, firstFrostDate, today.getTime()]);

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    const html = `<!DOCTYPE html>
<html><head><title>Seed Planting Checklist</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 28px; }
  .item { display: flex; align-items: flex-start; gap: 14px; padding: 12px 16px; border: 1px solid #ddd; border-radius: 10px; margin-bottom: 10px; break-inside: avoid; }
  .checkbox { width: 18px; height: 18px; border: 2px solid #999; border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
  .emoji { font-size: 20px; line-height: 1; flex-shrink: 0; }
  .info { flex: 1; }
  .name { font-weight: 600; font-size: 15px; }
  .variety { font-size: 12px; color: #b07040; font-weight: 500; margin-left: 6px; }
  .tag { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 99px; margin-left: 8px; }
  .tag-indoor { background: #f0e6f6; color: #7b4fa0; }
  .tag-sow { background: #e8f0e4; color: #4a6e3a; }
  .details { font-size: 12px; color: #777; margin-top: 4px; }
  .overdue { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #c17644; flex-shrink: 0; margin-top: 4px; }
  .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
  .empty { text-align: center; padding: 60px 0; color: #999; font-size: 18px; }
</style></head><body>
<h1>Seed Planting Checklist</h1>
<p class="subtitle">Seeds to start by ${formatDate(today)} · Zone ${state.zone}${lastFrostDate ? ` · Last frost: ${formatDate(lastFrostDate)}` : ''}</p>
${checklistItems.length === 0 ? '<p class="empty">No seeds due yet!</p>' : checklistItems.map(item => `
<div class="item">
  <div class="checkbox"></div>
  <span class="emoji">${item.plant.emoji}</span>
  <div class="info">
    <div><span class="name">${item.plant.name}</span>${item.variety ? `<span class="variety">'${item.variety}'</span>` : ''}<span class="tag ${item.action === 'Start indoors' ? 'tag-indoor' : 'tag-sow'}">${item.action}</span></div>
    <div class="details">Due ${formatDate(item.date)}${item.nextStep ? ` · ${item.nextStep}` : ''}${item.plant.daysToMaturity ? ` · ${item.plant.daysToMaturity} days to harvest` : ''}</div>
  </div>
  ${item.overdue ? '<span class="overdue">Overdue</span>' : ''}
</div>`).join('')}
${checklistItems.length > 0 ? `<p class="footer">Garden Grove · ${checklistItems.length} item${checklistItems.length !== 1 ? 's' : ''} · Generated ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
<script>window.onload = function() { window.print(); }</script>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-print-checklist
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        data-print-content
        className="bg-white dark:bg-midnight-green rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sage/10 dark:border-sage-dark/15 " style={{ padding: '24px 32px' }}>
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-deep dark:text-cream">
              Seed Planting Checklist
            </h2>
            <p className="text-sm text-sage-dark/70 dark:text-sage/60" style={{ marginTop: 4 }}>
              Seeds to start by {formatDate(today)} &middot; Zone {state.zone}
              {state.lastFrostMMDD && ` &middot; Last frost: ${formatDate(lastFrostDate)}`}
              {checklistItems.length > 0 && (() => {
                const done = checklistItems.filter(i => i.started).length;
                return ` &middot; ${done}/${checklistItems.length} started`;
              })()}
            </p>
          </div>
          <div className="flex items-center" data-print-hide style={{ gap: 8 }}>
            {checklistItems.length > 0 && (() => {
              const allStarted = checklistItems.every(i => i.started);
              return (
                <button
                  onClick={() => {
                    const ids = checklistItems.filter(i => i.invId).map(i => i.invId);
                    dispatch({ type: 'SET_SEEDS_STARTED', payload: { ids, started: !allStarted } });
                  }}
                  className="flex items-center rounded-xl bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream hover:bg-forest/20 dark:hover:bg-sage/25 transition-colors text-sm font-medium"
                  style={{ padding: '10px 18px', gap: 8 }}
                >
                  <CheckCheck className="w-4 h-4" />
                  {allStarted ? 'Deselect All' : 'Select All'}
                </button>
              );
            })()}
            <button
              onClick={handlePrint}
              className="flex items-center rounded-xl bg-forest/10 text-forest dark:bg-sage/15 dark:text-cream hover:bg-forest/20 dark:hover:bg-sage/25 transition-colors text-sm font-medium"
              style={{ padding: '10px 18px', gap: 8 }}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-sage-dark/50 hover:text-sage-dark hover:bg-sage/10 dark:text-sage/50 dark:hover:text-cream dark:hover:bg-sage/15 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '24px 32px 32px' }}>
          {checklistItems.length === 0 ? (
            <div className="text-center" style={{ padding: '48px 0' }}>
              <CheckSquare className="w-12 h-12 text-sage/30 mx-auto" style={{ marginBottom: 16 }} />
              <p className="font-display text-xl text-sage-dark/50 dark:text-sage/40">
                No seeds due yet!
              </p>
              <p className="text-sm text-sage-dark/35 dark:text-sage/25" style={{ marginTop: 8 }}>
                Check back as your planting dates approach.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {checklistItems.map((item, i) => (
                <div
                  key={`${item.plant.id}-${item.action}-${i}`}
                  className="flex items-start rounded-xl border border-sage/10 dark:border-sage-dark/15"
                  style={{ padding: '14px 18px', gap: 14 }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => item.invId && dispatch({ type: 'TOGGLE_SEED_STARTED', payload: item.invId })}
                    className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                      item.started
                        ? 'bg-forest border-forest text-cream'
                        : 'border-sage/30 dark:border-sage-dark/40 hover:border-forest/50'
                    }`}
                    style={{ marginTop: 2 }}
                  >
                    {item.started && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>

                  {/* Emoji */}
                  <span className="text-xl leading-none shrink-0" style={{ marginTop: 1 }}>
                    {item.plant.emoji}
                  </span>

                  {/* Info */}
                  <div className={`flex-1 min-w-0 ${item.started ? 'opacity-50' : ''}`}>
                    <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                      <span className={`font-medium text-forest-deep dark:text-cream ${item.started ? 'line-through' : ''}`}>
                        {item.plant.name}
                      </span>
                      {item.variety && (
                        <span className="text-[11px] text-terra dark:text-terra-light font-medium">
                          '{item.variety}'
                        </span>
                      )}
                      <span className={`text-xs font-medium rounded-full print:border ${
                        item.action === 'Start indoors'
                          ? 'bg-bloom-purple/10 text-bloom-purple dark:bg-bloom-purple/20'
                          : 'bg-sage/10 text-sage-dark dark:bg-sage/20 dark:text-sage-light'
                      }`} style={{ padding: '2px 10px' }}>
                        {item.action}
                      </span>
                    </div>
                    <div className="text-xs text-sage-dark/60 dark:text-sage/50" style={{ marginTop: 4 }}>
                      Due {formatDate(item.date)}
                      {item.nextStep && ` · ${item.nextStep}`}
                      {item.plant.daysToMaturity && ` · ${item.plant.daysToMaturity} days to harvest`}
                    </div>
                  </div>

                  {/* Overdue indicator — screen only */}
                  {item.overdue && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-terra shrink-0" style={{ marginTop: 4 }}>
                      Overdue
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {checklistItems.length > 0 && (
            <p className="text-[11px] text-sage-dark/40 dark:text-sage/30 text-center" style={{ marginTop: 24 }}>
              Garden Grove &middot; {checklistItems.length} item{checklistItems.length !== 1 ? 's' : ''} &middot; Generated {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
