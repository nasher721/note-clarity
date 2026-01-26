
import { InferenceMode } from '@/components/clinical/InferenceMode';
import { useAuth } from '@/hooks/useAuth';
import { useLearnedRules } from '@/hooks/documents/useLearnedRules';
import { useState, useEffect } from 'react';
import { ChunkAnnotation } from '@/types/clinical';

export function InferenceRoute() {
    const { user } = useAuth();
    const { getLearnedRules } = useLearnedRules(user?.id);
    const [learnedRules, setLearnedRules] = useState<ChunkAnnotation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getLearnedRules().then(rules => {
            setLearnedRules(rules);
            setLoading(false);
        });
    }, [getLearnedRules]);

    if (loading) {
        return <div>Loading inference models...</div>;
    }

    return (
        <InferenceMode learnedAnnotations={learnedRules} />
    );
}
