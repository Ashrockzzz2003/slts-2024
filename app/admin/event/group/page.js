'use client';

import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import secureLocalStorage from 'react-secure-storage';
import { getJudgeEventData } from '@/app/_util/data';
import { auth } from '@/app/_util/initApp';
import {
  calculateGroupTopCutoffTie,
  formatTieSummary,
} from '@/app/_util/tieDetection';

export default function GroupEventLeaderboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [eventName, setEventName] = useState(null);
  const [eventMetadata, setEventMetadata] = useState(null);
  const [groups, setGroups] = useState(null);
  const [orderedJudges, setOrderedJudges] = useState([]);
  const [topCutoffTie, setTopCutoffTie] = useState(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (!secureLocalStorage.getItem('user')) {
      router.push('/');
    }

    const user = JSON.parse(secureLocalStorage.getItem('user'));
    const _eventName = decodeURIComponent(searchParams.get('event') ?? '');
    setEventName(_eventName);

    if (user.role !== 'admin' || !_eventName) {
      router.push('/');
    } else {
      setUser(user);
      getJudgeEventData(_eventName)
        .then(async (_data) => {
          if (_data == null || _data.length != 2) {
            router.push('/');
          }

          // Group participants by district (Balvikas)
          const groupedData = _data[0].reduce((acc, participant) => {
            const key = participant.district || 'Unknown';
            if (!acc[key]) {
              acc[key] = {
                ...participant,
                members: [],
              };
            }
            acc[key].members.push({
              ...participant,
              name: participant.studentFullName || 'Unknown',
              id: participant.studentId || 'Unknown ID',
              ATTENDEE_STATUS: participant.ATTENDEE_STATUS,
            });
            return acc;
          }, {});

          const groups = Object.values(groupedData).map((group) => {
            const { members, ...rest } = group;
            return { members, ...rest };
          });

          // Calculate scores (same for all members)
          groups.forEach((group) => {
            group.judgeWiseTotal = {};
            Object.keys(_data[1].evalCriteria).forEach((criteria) => {
              _data[1].judgeIdList.forEach((judgeId) => {
                if (!group.score) {
                  group.score = {};
                }
                if (!group.score[_eventName]) {
                  group.score[_eventName] = {};
                }
                if (!group.score[_eventName][judgeId]) {
                  group.score[_eventName][judgeId] = {};
                }
                if (!group.score[_eventName][judgeId][criteria]) {
                  group.score[_eventName][judgeId][criteria] = 0;
                }

                if (!group.judgeWiseTotal[judgeId]) {
                  group.judgeWiseTotal[judgeId] = 0;
                }

                group.judgeWiseTotal[judgeId] += parseFloat(
                  group.score[_eventName][judgeId][criteria],
                );
              });
              group.overallTotal = Object.values(group.judgeWiseTotal).reduce(
                (a, b) => a + b,
                0,
              );
            });
          });

          groups.forEach((group) => {
            _data[1].judgeIdList.forEach((judgeId) => {
              if (!group.comment) {
                group.comment = {};
              }

              if (!group.comment[eventName]) {
                group.comment[eventName] = {};
              }

              if (!group.comment[eventName][judgeId]) {
                group.comment[eventName][judgeId] = '-';
              }
            });
          });

          // Sort groups by overallTotal
          groups.sort((a, b) => b.overallTotal - a.overallTotal);

          setEventMetadata(_data[1]);
          setGroups(groups);
          setTopCutoffTie(
            calculateGroupTopCutoffTie(groups, _data[1], _eventName),
          );
        })
        .catch((err) => {
          console.error(err);
          alert('Invalid Link');
          router.push('/admin/event');
        });
    }
  }, [router, eventName, searchParams]);

  // Add this useEffect to fetch judge names from eventJudgeMapping
  useEffect(() => {
    if (!eventMetadata || !groups || !eventName) return;

    const fetchJudgeNames = async () => {
      const db = getFirestore();

      try {
        // Get the event document from eventJudgeMapping collection
        const eventJudgeMappingDoc = await getDoc(
          doc(db, 'eventJudgeMapping', eventName),
        );

        if (eventJudgeMappingDoc.exists()) {
          const data = eventJudgeMappingDoc.data();
          const judgeOrder = data.judgeOrder || [];

          // Extract judge names from judgeOrder array
          // judgeOrder structure: [{ name: "Judge Name", order: 1 }, ...]
          const sortedJudges = [...judgeOrder].sort(
            (a, b) => a.order - b.order,
          );
          const judgeNames = sortedJudges.map(
            (judge) => judge.name || 'Unknown',
          );

          setOrderedJudges(judgeNames);
        } else {
          // Fallback: create generic judge names
          const fallbackNames = eventMetadata.judgeIdList.map(
            (_, i) => `Judge ${i + 1}`,
          );
          setOrderedJudges(fallbackNames);
        }
      } catch (err) {
        console.error('Error fetching judge names:', err);
        // Fallback: create generic judge names
        const fallbackNames = eventMetadata.judgeIdList.map(
          (_, i) => `Judge ${i + 1}`,
        );
        setOrderedJudges(fallbackNames);
      }
    };

    fetchJudgeNames();
  }, [eventMetadata, groups, eventName]);

  const exportForCert = () => {
    if (!groups || !eventMetadata) return;

    const topGroups = groups.slice(0, 5);
    const flatList = [];

    topGroups.forEach((group, index) => {
      const rank = index + 1;
      group.members.forEach((member) => {
        const row = {
          eventName: eventName,
          Rank: rank,
          ...member,
          // Rename keys to match Individual export
          studentFullName: member.name,
          studentId: member.id,
          district: group.district || 'Unknown',
          OverallTotal: parseFloat(group.overallTotal ?? 0).toFixed(2),
        };
        flatList.push(row);
      });
    });

    if (flatList.length === 0) return;

    const allKeys = new Set();
    flatList.forEach((item) => {
      Object.keys(item).forEach((key) => {
        const val = item[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          return;
        }
        allKeys.add(key);
      });
    });

    const headers = Array.from(allKeys).sort();
    const prioritized = [
      'eventName',
      'Rank',
      'studentFullName',
      'studentId',
      'district',
      'studentGroup',
      'OverallTotal',
    ];
    const sortedHeaders = [
      ...prioritized.filter((h) => headers.includes(h)),
      ...headers.filter((h) => !prioritized.includes(h)),
    ];

    const escapeCSV = (value) => {
      if (value == null) return '';
      if (Array.isArray(value)) return `"${value.join('; ')}"`;
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      sortedHeaders.map(escapeCSV).join(','),
      ...flatList.map((row) =>
        sortedHeaders.map((header) => escapeCSV(row[header])).join(','),
      ),
    ].join('\r\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}_top5_cert_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add this function for CSV export
  const exportToCSV = () => {
    if (!groups || !eventMetadata || orderedJudges.length === 0) return;

    // Helper function to properly escape CSV values
    const escapeCSV = (value) => {
      if (value == null) return '';
      const str = String(value);
      // If contains comma, newline, or quotes, wrap in quotes and escape internal quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // ---------- HEADERS ----------
    const numJudges = eventMetadata.judgeIdList.length;
    const cleanJudgeNames = [];

    for (let i = 0; i < numJudges; i++) {
      const judgeName = orderedJudges[i];
      if (
        !judgeName ||
        judgeName === 'Unknown' ||
        judgeName.trim().length < 3
      ) {
        cleanJudgeNames.push(`Judge ${i + 1}`);
      } else {
        cleanJudgeNames.push(judgeName.trim());
      }
    }

    const criteriaList = Object.keys(eventMetadata.evalCriteria);

    const headers = [
      'District',
      'Student IDs',
      'Student Names',
      'Attendance',

      // Criteria scores per judge
      ...criteriaList.flatMap((criteria) =>
        cleanJudgeNames.map((judgeName) => {
          return `${criteria} (${judgeName})`;
        }),
      ),

      // Judge totals
      ...cleanJudgeNames.map((j) => `Total (${j})`),

      'Overall Total',

      // Comments
      ...cleanJudgeNames.map((j) => `Comment (${j})`),
    ];

    // ---------- ROWS ----------
    const rows = groups.map((group) => {
      // Combine student IDs and names
      const studentIds = group.members.map((m) => m.id).join('; ');
      const studentNames = group.members.map((m) => m.name).join('; ');
      const attendance = group.members
        .map((m) =>
          m.ATTENDEE_STATUS === 'Attended' ? 'Present' : 'Yet to Check In',
        )
        .join('; ');

      // Build scores in exact order - criteria first, then judges within each criteria
      const scores = [];
      criteriaList.forEach((criteria) => {
        eventMetadata.judgeIdList.forEach((judgeId) => {
          const score = group.score?.[eventName]?.[judgeId]?.[criteria] ?? 0;
          scores.push(score);
        });
      });

      // Get judge totals - must be in same order as judgeIdList
      const judgeTotals = [];
      eventMetadata.judgeIdList.forEach((judgeId) => {
        const total = group.judgeWiseTotal?.[judgeId] ?? 0;
        judgeTotals.push(parseFloat(total).toFixed(2));
      });

      // Get comments - must be in same order as judgeIdList
      const comments = [];
      eventMetadata.judgeIdList.forEach((judgeId) => {
        const comment = group.comment?.[eventName]?.[judgeId] || '-';
        // Clean up comment: remove extra whitespace and newlines
        comments.push(String(comment).replace(/\s+/g, ' ').trim());
      });

      return [
        group.district ?? 'Unknown',
        studentIds,
        studentNames,
        attendance,

        ...scores,
        ...judgeTotals,
        parseFloat(group.overallTotal ?? 0).toFixed(2),
        ...comments,
      ];
    });

    // Build CSV with proper escaping
    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((r) => r.map(escapeCSV).join(',')),
    ].join('\r\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}_group_leaderboard.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return eventName && user && eventMetadata && groups ? (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user.name}
            </h1>
            <p className="text-gray-500">{user.email}</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              className="flex-1 md:flex-none bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold px-4 py-2 rounded-xl transition-colors"
              onClick={() => router.push('/admin/event')}
            >
              Events
            </button>
            <button
              className="flex-1 md:flex-none bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold px-4 py-2 rounded-xl transition-colors"
              onClick={() => router.push('/admin')}
            >
              Dashboard
            </button>
            <button
              className="flex-1 md:flex-none bg-red-100 text-red-800 hover:bg-red-200 font-semibold px-4 py-2 rounded-xl transition-colors"
              onClick={() => {
                auth.signOut();
                secureLocalStorage.clear();
                router.push('/');
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {eventMetadata.name}
              </h2>
              <p className="text-gray-500 mb-4">
                {groups.length} Groups registered
              </p>
              <div className="flex flex-wrap gap-2">
                {eventMetadata.group.map((group, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
            <div className="w-full md:w-80">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Evaluation Criteria
              </h3>
              <div className="space-y-2">
                {Object.entries(eventMetadata.evalCriteria).map(
                  ([key, value], index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600">{key}</span>
                      <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {value} pts
                      </span>
                    </div>
                  ),
                )}
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900">
                  <span>Total Maximum Marks</span>
                  <span className="text-blue-600">
                    {Object.values(eventMetadata.evalCriteria).reduce(
                      (a, b) => a + b,
                      0,
                    )}{' '}
                    pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {topCutoffTie && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Top 5 tie needs review
                </h3>
                <p className="text-sm text-amber-800">
                  {formatTieSummary(topCutoffTie)}.
                </p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                Tie alert
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={exportForCert}
                className="flex-1 sm:flex-none items-center justify-center inline-flex gap-2 bg-green-100 text-green-700 hover:bg-green-200 font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Cert Export
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 sm:flex-none items-center justify-center inline-flex gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Full CSV
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Group Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Member Details
                  </th>
                  {eventMetadata.evalCriteria &&
                    Object.keys(eventMetadata.evalCriteria).map(
                      (criteria, index) => (
                        <th
                          key={index}
                          className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {criteria.split('&').map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && (
                                <>
                                  &<br />
                                </>
                              )}
                            </span>
                          ))}
                        </th>
                      ),
                    )}
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Judge Wise
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group, index) => {
                  const isTopCutoffTie = topCutoffTie?.ids.has(
                    group.district || 'Unknown',
                  );
                  return (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 transition-colors ${isTopCutoffTie ? 'bg-amber-50/80' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-gray-900">
                            #{index + 1}
                          </span>
                          {isTopCutoffTie && (
                            <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                              TOP 5 TIE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {group.district}
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.members.length} members
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {group.members.map((member, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                                {member.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                  {member.id}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    member.ATTENDEE_STATUS === 'Attended'
                                      ? 'bg-green-50 text-green-700 border-green-100'
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                  }`}
                                >
                                  {member.ATTENDEE_STATUS === 'Attended'
                                    ? 'P'
                                    : 'A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      {eventMetadata.evalCriteria &&
                        Object.keys(eventMetadata.evalCriteria).map(
                          (criteria, i1) => (
                            <td
                              key={i1}
                              className="px-2 py-4 text-center"
                            >
                              <div className="flex flex-col gap-1">
                                {eventMetadata.judgeIdList.map(
                                  (judgeId, i2) => (
                                    <span
                                      key={i2}
                                      className="text-xs font-medium text-gray-600 tabular-nums"
                                    >
                                      {
                                        group.score[eventName][judgeId][
                                          criteria
                                        ]
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            </td>
                          ),
                        )}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {eventMetadata.judgeIdList.map((judgeId, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 justify-between w-16"
                            >
                              <span className="text-[10px] text-gray-400 font-medium">
                                J{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-gray-900 tabular-nums text-right">
                                {parseFloat(
                                  group.judgeWiseTotal[judgeId] || 0,
                                ).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-black text-blue-600 tabular-nums">
                          {parseFloat(group.overallTotal).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {eventMetadata.judgeIdList.map((judgeId, i) => {
                            const comment = group.comment[eventName][judgeId];
                            if (!comment || comment === '-') return null;
                            return (
                              <div
                                key={i}
                                className="bg-gray-50 p-2 rounded-lg border border-gray-100"
                              >
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                                  Judge {i + 1}
                                </p>
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-normal">
                                  {comment}
                                </p>
                              </div>
                            );
                          })}
                          {!eventMetadata.judgeIdList.some(
                            (jid) =>
                              group.comment[eventName][jid] &&
                              group.comment[eventName][jid] !== '-',
                          ) && (
                            <span className="text-gray-400 italic text-xs">
                              No comments
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50">
            {groups.map((group, index) => {
              const isTopCutoffTie = topCutoffTie?.ids.has(
                group.district || 'Unknown',
              );
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-4 shadow-sm border ${isTopCutoffTie ? 'border-amber-200 bg-amber-50/80' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        #{index + 1}
                      </span>
                      {isTopCutoffTie && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          TOP 5 TIE
                        </span>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {group.district ?? 'Unknown'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {group.members.length} members
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-blue-600">
                      {parseFloat(group.overallTotal).toFixed(2)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Members
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.members.map((member, i) => (
                        <div
                          key={i}
                          className="flex flex-col bg-gray-50 rounded p-2 text-xs border border-gray-100 flex-1 min-w-[120px]"
                        >
                          <span className="font-medium text-gray-900 truncate">
                            {member.name}
                          </span>
                          <div className="flex justify-between mt-1 items-center">
                            <span className="text-gray-500 text-[10px]">
                              {member.id}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                member.ATTENDEE_STATUS === 'Attended'
                                  ? 'bg-green-50 text-green-700 border-green-100'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                              }`}
                            >
                              {member.ATTENDEE_STATUS === 'Attended'
                                ? 'P'
                                : 'A'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                      <span>Judge Scores</span>
                      <span>Total</span>
                    </div>
                    {eventMetadata.judgeIdList.map((judgeId, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-gray-600">Judge {i + 1}</span>
                        <span className="font-bold text-gray-900">
                          {parseFloat(
                            group.judgeWiseTotal[judgeId] || 0,
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {eventMetadata.judgeIdList.some(
                    (jid) =>
                      group.comment[eventName][jid] &&
                      group.comment[eventName][jid] !== '-',
                  ) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                        Comments
                      </p>
                      <div className="space-y-2">
                        {eventMetadata.judgeIdList.map((judgeId, i) => {
                          const comment = group.comment[eventName][judgeId];
                          if (!comment || comment === '-') return null;
                          return (
                            <div
                              key={i}
                              className="text-xs text-gray-600"
                            >
                              <span className="font-semibold text-gray-800">
                                J{i + 1}:{' '}
                              </span>{' '}
                              {comment}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Loading leaderboard...</p>
      </div>
    </div>
  );
}
