import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sprint } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Reports() {
  const [closedSprints, setClosedSprints] = useState<Sprint[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qSprints = query(
      collection(db, 'sprints'),
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'closed')
    );

    const unsubscribe = onSnapshot(qSprints, (snapshot) => {
      const sprintsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sprint[];

      sprintsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setClosedSprints(sprintsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sprints');
    });

    return unsubscribe;
  }, []);

  const data = closedSprints.map(sprint => ({
    name: sprint.name,
    Total: sprint.totalTasks || 0,
    Completed: sprint.completedTasks || 0,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Sprint Reports</h1>

      {closedSprints.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
          No closed sprints yet. Complete a sprint to see your progress!
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">Sprint Success Rate</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #374151', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: 'var(--tooltip-bg, rgba(255, 255, 255, 0.9))', color: 'var(--tooltip-text, #111827)' }}
                  itemStyle={{ color: 'var(--tooltip-text, #111827)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Total" stroke="#9CA3AF" fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="Completed" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
