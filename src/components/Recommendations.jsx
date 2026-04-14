import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { generateRecommendations } from '../data/recommendations';
import { getPlantById } from '../data/plants';
import { Lightbulb, ArrowRight, AlertTriangle, Heart, Shield, Ruler, Zap } from 'lucide-react';

const TYPE_STYLES = {
  warning: { bg: 'bg-bloom-red/6 dark:bg-bloom-red/10', border: 'border-bloom-red/15', icon: AlertTriangle, iconColor: 'text-bloom-red' },
  companion: { bg: 'bg-sage/6 dark:bg-sage/10', border: 'border-sage/15', icon: Heart, iconColor: 'text-sage' },
  protection: { bg: 'bg-amber/6 dark:bg-amber/10', border: 'border-amber/15', icon: Shield, iconColor: 'text-amber' },
  pollinator: { bg: 'bg-bloom-yellow/6 dark:bg-bloom-yellow/10', border: 'border-bloom-yellow/15', icon: Zap, iconColor: 'text-bloom-yellow' },
  structure: { bg: 'bg-terra/6 dark:bg-terra/10', border: 'border-terra/15', icon: Ruler, iconColor: 'text-terra' },
  spacing: { bg: 'bg-bloom-purple/6 dark:bg-bloom-purple/10', border: 'border-bloom-purple/15', icon: Ruler, iconColor: 'text-bloom-purple' },
  enhancement: { bg: 'bg-bloom-blue/6 dark:bg-bloom-blue/10', border: 'border-bloom-blue/15', icon: Lightbulb, iconColor: 'text-bloom-blue' },
};

export default function Recommendations() {
  const { state, dispatch } = useStore();

  const activePlot = state.plots.find(p => p.id === state.activePlotId);

  const tips = useMemo(() => {
    if (!activePlot) return [];
    return generateRecommendations(
      activePlot.plants,
      activePlot.elements,
      state.zone
    );
  }, [activePlot, state.zone]);

  // Also gather tips from all plots combined
  const allPlants = state.plots.flatMap(p => p.plants);
  const allElements = state.plots.flatMap(p => p.elements);
  const globalTips = useMemo(() => {
    return generateRecommendations(allPlants, allElements, state.zone);
  }, [allPlants, allElements, state.zone]);

  const displayTips = tips.length > 0 ? tips : globalTips;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-sage/10 dark:border-sage-dark/15 px-5 py-6 sm:px-10 sm:py-10 sm:pb-8">
        <h2 className="font-display text-2xl font-semibold text-forest-deep dark:text-cream">
          Garden Recommendations
        </h2>
        <p className="text-sm text-sage-dark/70 dark:text-sage/60" style={{ marginTop: 10 }}>
          {displayTips.length > 0
            ? `${displayTips.length} suggestions to improve ${activePlot?.name || 'my garden'}`
            : 'Add plants to get personalized recommendations'
          }
        </p>
      </div>

      {/* Tips */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-10">
        <div className="max-w-2xl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {displayTips.map((tip, i) => {
            const style = TYPE_STYLES[tip.type] || TYPE_STYLES.enhancement;
            const Icon = style.icon;

            return (
              <motion.div
                key={`${tip.title}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`${style.bg} border ${style.border} rounded-2xl flex items-start transition-all duration-200 hover:shadow-sm`}
                style={{ padding: 28, gap: 20 }}
              >
                <div className={`mt-0.5 ${style.iconColor} opacity-80`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center" style={{ gap: 12 }}>
                    <span className="text-lg leading-none">{tip.icon}</span>
                    <h3 className="text-sm font-semibold text-forest-deep dark:text-cream leading-tight">
                      {tip.title}
                    </h3>
                  </div>
                  <p className="text-xs text-sage-dark/70 dark:text-sage/60 leading-relaxed" style={{ marginTop: 10 }}>
                    {tip.description}
                  </p>

                  {tip.plantId && (
                    <button
                      onClick={() => {
                        dispatch({ type: 'ADD_TO_INVENTORY', payload: tip.plantId });
                      }}
                      className="inline-flex items-center text-[10px] font-semibold text-forest dark:text-sage-light hover:text-terra transition-colors rounded-lg bg-forest/5 dark:bg-sage/10 hover:bg-terra/8"
                      style={{ marginTop: 14, gap: 8, padding: '6px 12px' }}
                    >
                      Add to inventory <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}

          {displayTips.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-sage/8 dark:bg-sage/12 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-sage/30" />
              </div>
              <p className="font-display text-xl text-sage-dark/50 dark:text-sage/40">No recommendations yet</p>
              <p className="text-sm mt-1.5 text-sage-dark/35 dark:text-sage/25">
                Add plants to my garden or seed inventory to get personalized tips
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
