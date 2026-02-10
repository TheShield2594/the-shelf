import { useState } from 'react';
import { CONTENT_LEVEL_LABELS } from '../types';

interface Props {
  initial?: {
    violence_level: number;
    language_level: number;
    sexual_content_level: number;
    substance_use_level: number;
    other_tags: string[];
  };
  onSubmit: (data: {
    violence_level: number;
    language_level: number;
    sexual_content_level: number;
    substance_use_level: number;
    other_tags: string[];
  }) => void;
  loading?: boolean;
}

function LevelSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-sm text-gray-500 dark:text-gray-400">{CONTENT_LEVEL_LABELS[value]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-shelf-600"
        aria-label={`${label}: ${CONTENT_LEVEL_LABELS[value]}`}
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        <span>None</span>
        <span>Graphic</span>
      </div>
    </div>
  );
}

export default function ContentRatingForm({ initial, onSubmit, loading }: Props) {
  const [violence, setViolence] = useState(initial?.violence_level ?? 0);
  const [language, setLanguage] = useState(initial?.language_level ?? 0);
  const [sexual, setSexual] = useState(initial?.sexual_content_level ?? 0);
  const [substance, setSubstance] = useState(initial?.substance_use_level ?? 0);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initial?.other_tags ?? []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  return (
    <div className="space-y-4">
      <LevelSlider label="Violence" value={violence} onChange={setViolence} />
      <LevelSlider label="Language" value={language} onChange={setLanguage} />
      <LevelSlider label="Sexual Content" value={sexual} onChange={setSexual} />
      <LevelSlider label="Substance Use" value={substance} onChange={setSubstance} />

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Additional Content Warnings
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="e.g., child death, animal harm..."
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-shelf-400 outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm transition"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs px-2 py-1 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
                {tag}
                <button
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                  aria-label={`Remove ${tag}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() =>
          onSubmit({
            violence_level: violence,
            language_level: language,
            sexual_content_level: sexual,
            substance_use_level: substance,
            other_tags: tags,
          })
        }
        disabled={loading}
        className="w-full bg-shelf-600 hover:bg-shelf-700 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50"
      >
        {loading ? 'Submitting...' : initial ? 'Update Content Rating' : 'Submit Content Rating'}
      </button>
    </div>
  );
}
