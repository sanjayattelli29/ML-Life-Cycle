import { useRouter } from 'next/navigation';

interface PreprocessingOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  path: string;
}

interface Props {
  datasetId: string;
}

export default function PreprocessingOptions({ datasetId }: Props) {
  const router = useRouter();

  const options: PreprocessingOption[] = [
    {
      id: 'missing-values',
      icon: '🧱',
      title: 'Missing Values',
      description: 'Handle null, undefined, or empty values in your dataset',
      path: `/dashboard/pre-processing/missing-values`
    },
    {
      id: 'outliers',
      icon: '🚨',
      title: 'Outliers',
      description: 'Detect and handle statistical outliers in numeric columns',
      path: `/dashboard/pre-processing/outliers`
    },
    {
      id: 'data-type-mismatch',
      icon: '🔠',
      title: 'Data Type Mismatch',
      description: 'Fix inconsistent data types across columns',
      path: `/dashboard/pre-processing/data-type-mismatch`
    },
    {
      id: 'duplicate-records',
      icon: '📄',
      title: 'Duplicate Records',
      description: 'Identify and remove duplicate entries',
      path: `/dashboard/pre-processing/duplicate-records`
    },
    {
      id: 'target-imbalance',
      icon: '⚖️',
      title: 'Target Imbalance',
      description: 'Balance target variable distribution',
      path: `/dashboard/pre-processing/target-imbalance`
    },
    {
      id: 'inconsistencies',
      icon: '🌀',
      title: 'Inconsistencies',
      description: 'Fix inconsistent values and formats',
      path: `/dashboard/pre-processing/inconsistencies`
    },
    {
      id: 'feature-correlation',
      icon: '🔗',
      title: 'Feature Correlation',
      description: 'Analyze and handle correlated features',
      path: `/dashboard/pre-processing/feature-correlation`
    },
    {
      id: 'range-violations',
      icon: '🚫',
      title: 'Range Violations',
      description: 'Detect and fix out-of-range values',
      path: `/dashboard/pre-processing/range-violations`
    },
    {
      id: 'mean-median-drift',
      icon: '📉',
      title: 'Mean vs Median Drift',
      description: 'Analyze distribution skewness',
      path: `/dashboard/pre-processing/mean-median-drift`
    },
    {
      id: 'low-variance',
      icon: '🪶',
      title: 'Low Variance Features',
      description: 'Identify and handle low-variance features',
      path: `/dashboard/pre-processing/low-variance`
    }
  ];

  const handleOptionClick = (path: string) => {
    router.push(`${path}?datasetId=${datasetId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {options.map((option) => (
        <div
          key={option.id}
          onClick={() => handleOptionClick(option.path)}
          className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center space-x-4">
            <span className="text-2xl">{option.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
