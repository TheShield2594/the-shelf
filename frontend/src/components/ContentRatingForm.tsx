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
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{CONTENT_LEVEL_LABELS[value]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-shelf-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
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
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Additional Content Warnings
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="e.g., child death, animal harm..."
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded text-sm transition"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded flex items-center">
                {tag}
                <button
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  className="ml-1 text-red-400 hover:text-red-600"
                >
                  x
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
        className="w-full bg-shelf-600 hover:bg-shelf-700 text-white py-2 rounded font-medium transition disabled:opacity-50"
      >
        {loading ? 'Submitting...' : initial ? 'Update Content Rating' : 'Submit Content Rating'}
      </button>
    </div>
  );
}
