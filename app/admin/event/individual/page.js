'use client';

import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import secureLocalStorage from 'react-secure-storage';
import { getJudgeEventData } from '@/app/_util/data';
import { auth } from '@/app/_util/initApp';
import {
  calculateIndividualTopCutoffTie,
  formatTieSummary,
} from '@/app/_util/tieDetection';

export default function EventLeaderboardIndiPage() {
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [user, setUser] = useState(null);
  const [eventMetadata, setEventMetadata] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [filteredParticipants, setFilteredParticipants] = useState(null);

  const [orderedJudges, setOrderedJudges] = useState([]);
  const [topCutoffTie, setTopCutoffTie] = useState(null);

  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');

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

          // Process data to calculate judge wise total and overall total
          // and handle missing data.
          _data[0].forEach((participant) => {
            participant.judgeWiseTotal = {};
            Object.keys(_data[1].evalCriteria).forEach((criteria) => {
              _data[1].judgeIdList.forEach((judgeId) => {
                if (!participant.score) {
                  participant.score = {};
                }
                if (!participant.score[_eventName]) {
                  participant.score[_eventName] = {};
                }
                if (!participant.score[_eventName][judgeId]) {
                  participant.score[_eventName][judgeId] = {};
                }
                if (!participant.score[_eventName][judgeId][criteria]) {
                  participant.score[_eventName][judgeId][criteria] = 0;
                }

                if (!participant.judgeWiseTotal[judgeId]) {
                  participant.judgeWiseTotal[judgeId] = 0;
                }

                participant.judgeWiseTotal[judgeId] += parseFloat(
                  participant.score[_eventName][judgeId][criteria],
                );
              });
              participant.overallTotal = Object.values(
                participant.judgeWiseTotal,
              ).reduce((a, b) => a + b, 0);
            });
          });

          // Handle comments.
          _data[0].forEach((participant) => {
            _data[1].judgeIdList.forEach((judgeId) => {
              if (!participant.comment) {
                participant.comment = {};
              }

              if (!participant.comment[_eventName]) {
                participant.comment[_eventName] = {};
              }

              if (!participant.comment[_eventName][judgeId]) {
                participant.comment[_eventName][judgeId] = '';
              }
            });
          });

          // Sort _data[0] based on overallTotal
          _data[0].sort((a, b) => b.overallTotal - a.overallTotal);

          setEventMetadata(_data[1]);
          setTopCutoffTie(
            calculateIndividualTopCutoffTie(_data[0], _data[1], _eventName),
          );

          const db = getFirestore();
          const mappingSnap = await getDoc(
            doc(db, 'eventJudgeMapping', _eventName),
          );

          let judges = [];

          if (mappingSnap.exists()) {
            const mapping = mappingSnap.data();
            const expected = mapping.expectedJudgeCount || 0;
            const judgeOrder = mapping.judgeOrder || [];

            judgeOrder.sort((a, b) => a.order - b.order);

            for (let i = 1; i <= expected; i++) {
              const found = judgeOrder.find((j) => j.order === i);
              judges.push(found?.name ?? 'Unknown');
            }
          } else {
            // fallback safety
            judges = _data[1].judgeIdList.map(() => 'Unknown');
          }

          setOrderedJudges(judges);

          setParticipants(_data[0]);
          setFilteredParticipants(_data[0]);
        })
        .catch((err) => {
          console.error(err);
          alert('Invalid Link');
          router.push('/admin/event');
        });
    }
  }, [router, searchParams]);

  const exportForCert = () => {
    if (!filteredParticipants || !eventMetadata) return;

    // Filter top 5 participants based on overallTotal (descending)
    // Assuming filteredParticipants are already sorted by overallTotal,
    // otherwise we would need to sort first:
    // const sorted = [...filteredParticipants].sort((a, b) => (b.overallTotal || 0) - (a.overallTotal || 0));
    const topParticipants = filteredParticipants.slice(0, 5);

    if (topParticipants.length === 0) return;

    const flatList = topParticipants.map((p, index) => {
      // Determine effective student name and related details if substituted
      const isSubstituted = p.substitute && p.substitute[eventMetadata.name];
      const studentName = isSubstituted
        ? p.substitute[eventMetadata.name].newStudentName
        : p.studentFullName;

      const studentGender = isSubstituted
        ? p.substitute[eventMetadata.name].newStudentGender
        : p.gender;

      const studentDOB = isSubstituted
        ? p.substitute[eventMetadata.name].newStudentDOB
        : p.dateOfBirth;

      const studentGroup = isSubstituted
        ? p.substitute[eventMetadata.name].newStudentGroup
        : p.studentGroup;

      return {
        eventName: eventName,
        Rank: index + 1,
        ...p,
        // Override with substituted values where applicable for the certificate
        studentFullName: studentName,
        gender: studentGender,
        dateOfBirth: studentDOB,
        studentGroup: studentGroup,
        // Format the total score
        OverallTotal: parseFloat(p.overallTotal ?? 0).toFixed(2),
      };
    });

    const allKeys = new Set();
    flatList.forEach((item) => {
      Object.keys(item).forEach((key) => {
        const val = item[key];
        // Skip complex objects/arrays except for specific ones if needed.
        // We generally want scalar values.
        if (
          val !== null &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          key !== 'Rank' // Rank is scalar but good to be explicit
        ) {
          return;
        }
        allKeys.add(key);
      });
    });

    const headers = Array.from(allKeys).sort();
    // Prioritize common certificate fields
    const prioritized = [
      'eventName',
      'Rank',
      'studentFullName',
      'studentId',
      'district',
      'samithiName',
      'OverallTotal',
      'studentGroup',
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

  const exportToCSV = () => {
    if (!filteredParticipants || !eventMetadata || orderedJudges.length === 0)
      return;

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
    // Create judge names for headers - MUST match the number of judges
    const numJudges = eventMetadata.judgeIdList.length;
    const cleanJudgeNames = [];

    for (let i = 0; i < numJudges; i++) {
      const judgeName = orderedJudges[i];
      // Always return a name, even for Unknown
      if (
        !judgeName ||
        judgeName === 'Unknown' ||
        judgeName.trim().length < 3
      ) {
        cleanJudgeNames.push(`Judge ${i + 1}`);
      } else {
        // Use full name
        cleanJudgeNames.push(judgeName.trim());
      }
    }

    const criteriaList = Object.keys(eventMetadata.evalCriteria);

    const headers = [
      'Student Name',
      'Student ID',
      'District',
      'Samithi',
      'Attendance',

      // Criteria scores per judge - one column per criteria per judge
      ...criteriaList.flatMap((criteria) =>
        cleanJudgeNames.map((judgeName) => {
          return `${criteria} (${judgeName})`;
        }),
      ),

      // Judge totals - MUST have one for each judge
      ...cleanJudgeNames.map((j) => `Total (${j})`),

      'Overall Total',

      // Comments - MUST have one for each judge
      ...cleanJudgeNames.map((j) => `Comment (${j})`),
    ];

    // ---------- ROWS ----------
    const rows = filteredParticipants.map((row) => {
      const studentName =
        row.substitute && row.substitute[eventMetadata.name]
          ? row.substitute[eventMetadata.name].newStudentName
          : (row.studentFullName ?? '-');

      // CRITICAL: Build scores in exact order - criteria first, then judges within each criteria
      const scores = [];
      criteriaList.forEach((criteria) => {
        eventMetadata.judgeIdList.forEach((judgeId) => {
          const score = row.score?.[eventName]?.[judgeId]?.[criteria] ?? 0;
          scores.push(score);
        });
      });

      // Get judge totals - must be in same order as judgeIdList
      const judgeTotals = [];
      eventMetadata.judgeIdList.forEach((judgeId) => {
        const total = row.judgeWiseTotal?.[judgeId] ?? 0;
        judgeTotals.push(parseFloat(total).toFixed(2));
      });

      // Get comments - must be in same order as judgeIdList
      const comments = [];
      eventMetadata.judgeIdList.forEach((judgeId) => {
        const comment = row.comment?.[eventName]?.[judgeId] || '-';
        // Clean up comment: remove extra whitespace and newlines
        comments.push(String(comment).replace(/\s+/g, ' ').trim());
      });

      return [
        studentName,
        row.studentId ?? '-',
        row.district ?? '-',
        row.samithiName ?? '-',

        row.ATTENDEE_STATUS === 'Attended' ? 'Present' : 'Yet to Check In',

        ...scores,
        ...judgeTotals,
        parseFloat(row.overallTotal ?? 0).toFixed(2),
        ...comments,
      ];
    });

    // Build CSV with proper escaping
    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((r) => r.map(escapeCSV).join(',')),
    ].join('\r\n'); // Use \r\n for better Excel compatibility

    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventName}_leaderboard.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return eventName &&
    user &&
    eventMetadata &&
    participants &&
    filteredParticipants ? (
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
                {participants.length} Participants enrolled
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

        {/* Leaderboard Card */}
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
                    Student Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    District & Samithi
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
                    Avg Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((row, index) => {
                  const isSubstituted =
                    row.substitute && row.substitute[eventMetadata.name];
                  const isTopCutoffTie = topCutoffTie?.ids.has(row.studentId);
                  return (
                    <tr
                      key={index}
                      className={`hover:bg-gray-50 transition-colors ${isTopCutoffTie ? 'bg-amber-50/80' : isSubstituted ? 'bg-red-50/50' : ''}`}
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
                      <td className="px-6 py-4">
                        {isSubstituted ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 w-fit mb-1">
                              SUBSTITUTE
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {
                                row.substitute[eventMetadata.name]
                                  .newStudentName
                              }
                            </span>
                            <span className="text-xs text-gray-500">
                              Orig ID: {row.studentId}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">
                              {row.studentFullName ?? '-'}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {row.studentId}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  row.ATTENDEE_STATUS === 'Attended'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                }`}
                              >
                                {row.ATTENDEE_STATUS === 'Attended'
                                  ? 'Present'
                                  : 'Absent'}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {row.district ?? '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.samithiName ?? '-'}
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
                                      {row.score[eventName][judgeId][criteria]}
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
                                  row.judgeWiseTotal[judgeId] || 0,
                                ).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="text-sm font-black text-blue-600 tabular-nums">
                          {parseFloat(row.overallTotal).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {eventMetadata.judgeIdList.map((judgeId, i) => {
                            const comment = row.comment[eventName][judgeId];
                            if (!comment) return null;
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
                            (jid) => row.comment[eventName][jid],
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
            {filteredParticipants.map((row, index) => {
              const isSubstituted =
                row.substitute && row.substitute[eventMetadata.name];
              const isTopCutoffTie = topCutoffTie?.ids.has(row.studentId);
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-4 shadow-sm border ${
                    isTopCutoffTie
                      ? 'border-amber-200 bg-amber-50/80'
                      : isSubstituted
                        ? 'border-red-200 bg-red-50/10'
                        : 'border-gray-200'
                  }`}
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
                      {isSubstituted ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 w-fit mb-1">
                            SUBSTITUTE
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {row.substitute[eventMetadata.name].newStudentName}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">
                            {row.studentFullName ?? '-'}
                          </h3>
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-black text-blue-600">
                      {parseFloat(row.overallTotal).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex flex-col">
                      <span className="text-gray-400">ID</span>
                      <span className="font-medium">
                        {isSubstituted
                          ? row.substitute[eventMetadata.name].newStudentId ||
                            'New ID'
                          : row.studentId}
                      </span>
                    </div>
                    <div className="flex flex-row items-center justify-end gap-2">
                      <span className="text-gray-400">Status</span>
                      <span
                        className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.ATTENDEE_STATUS === 'Attended'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                        }`}
                      >
                        {row.ATTENDEE_STATUS === 'Attended'
                          ? 'Present'
                          : 'Absent'}
                      </span>
                    </div>
                    <div className="flex flex-col col-span-2 mt-2">
                      <span className="text-gray-400">Location</span>
                      <span className="font-medium">
                        {row.district ?? '-'} / {row.samithiName ?? '-'}
                      </span>
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
                          {parseFloat(row.judgeWiseTotal[judgeId] || 0).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {eventMetadata.judgeIdList.some(
                    (jid) => row.comment[eventName][jid],
                  ) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                        Comments
                      </p>
                      <div className="space-y-2">
                        {eventMetadata.judgeIdList.map((judgeId, i) => {
                          const comment = row.comment[eventName][judgeId];
                          if (!comment) return null;
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
