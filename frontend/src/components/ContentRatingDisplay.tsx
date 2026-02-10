import { ContentRatingAvg, CONTENT_LEVEL_LABELS, CONTENT_LEVEL_COLORS } from '../types';

interface Props {
  rating: ContentRatingAvg;
}

function LevelBar({ label, icon, level }: { label: string; icon: string; level: number }) {
  const rounded = Math.round(level);
  const pct = (level / 4) * 100;

  return (
    <div className="flex items-center space-x-3">
      <span className="text-lg w-6 text-center">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONTENT_LEVEL_COLORS[rounded]}`}>
            {CONTENT_LEVEL_LABELS[rounded]}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              rounded === 0 ? 'bg-green-400' :
              rounded === 1 ? 'bg-yellow-400' :
              rounded === 2 ? 'bg-orange-400' :
              rounded === 3 ? 'bg-red-400' : 'bg-red-600'
            }`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ContentRatingDisplay({ rating }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Content Ratings</h3>
        <span className="text-xs text-gray-500">
          Based on {rating.count} rating{rating.count !== 1 ? 's' : ''} from readers
        </span>
      </div>

      <div className="space-y-3">
        <LevelBar label="Violence" icon="⚔" level={rating.violence_level} />
        <LevelBar label="Language" icon="💬" level={rating.language_level} />
        <LevelBar label="Sexual Content" icon="♥" level={rating.sexual_content_level} />
        <LevelBar label="Substance Use" icon="🧪" level={rating.substance_use_level} />
      </div>

      {rating.common_tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Content warnings:</p>
          <div className="flex flex-wrap gap-1">
            {rating.common_tags.map((tag) => (
              <span key={tag} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
