'use client';

import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import secureLocalStorage from 'react-secure-storage';
import {
  getEventData,
  getJudgeEventData,
  updateCrieria,
} from '@/app/_util/data';
import { auth } from '@/app/_util/initApp';
import {
  calculateGroupTopCutoffTie,
  calculateIndividualTopCutoffTie,
  formatTieSummary,
} from '@/app/_util/tieDetection';

export default function ManageEvents() {
  const router = useRouter();
  const [user, setUser] = useState({});
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [cIsOpen, setCIsOpen] = useState(false);
  const [eventNameBuffer, setEventNameBuffer] = useState('');
  const [criteriaBuffer, setCriteriaBuffer] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [copiedJudge, setCopiedJudge] = useState(null);
  const [eventTieAlerts, setEventTieAlerts] = useState({});

  useEffect(() => {
    if (!secureLocalStorage.getItem('user')) {
      router.push('/');
    }

    const user = JSON.parse(secureLocalStorage.getItem('user'));
    setUser(user);
    getEventData().then((_data) => {
      if (_data == null || _data.length != 2) {
        router.push('/');
      }

      setData(_data[0]);
      setFilteredData(_data[0]);
      setGroups(_data[1]);

      isLoading && setIsLoading(false);

      Promise.all(
        _data[0].map(async (event) => {
          try {
            const result = await getJudgeEventData(event.name);
            if (!result || result.length !== 2) return [event.name, null];

            const tie = event.name.includes('GROUP')
              ? calculateGroupTopCutoffTie(result[0], result[1], event.name)
              : calculateIndividualTopCutoffTie(
                  result[0],
                  result[1],
                  event.name,
                );

            return [event.name, tie];
          } catch (err) {
            console.error(`Unable to check ties for ${event.name}:`, err);
            return [event.name, null];
          }
        }),
      ).then((alerts) => {
        setEventTieAlerts(
          Object.fromEntries(alerts.filter(([, tie]) => Boolean(tie))),
        );
      });
    });
  }, [router, isLoading]);

  useEffect(() => {
    if (data) {
      setFilteredData(
        data.filter((row) => {
          return (
            (filterGroup == '' || row.group.includes(filterGroup)) &&
            (searchQuery == '' ||
              row.name.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }),
      );
    }
  }, [data, filterGroup, searchQuery]);

  const downloadFinalResults = async () => {
    if (!data || data.length === 0) return;

    const allRows = [];

    // ---------- LOOP EVENTS ----------
    for (const event of data) {
      const isGroup = event.name.includes('GROUP');

      const result = await getJudgeEventData(event.name);
      if (!result || result.length !== 2) continue;

      const participants = result[0];
      const meta = result[1];

      const judgeIds = meta.judgeIdList;
      const criteriaList = Object.keys(meta.evalCriteria);

      // ===============================
      // INDIVIDUAL EVENTS
      // ===============================
      if (!isGroup) {
        participants.forEach((p) => {
          p.judgeWiseTotal = {};
          judgeIds.forEach((jid) => (p.judgeWiseTotal[jid] = 0));

          criteriaList.forEach((c) => {
            judgeIds.forEach((jid) => {
              const score = parseFloat(p.score?.[event.name]?.[jid]?.[c] ?? 0);
              p.judgeWiseTotal[jid] += score;
            });
          });

          p.overallTotal = Object.values(p.judgeWiseTotal).reduce(
            (a, b) => a + b,
            0,
          );
        });

        // Take top 5 to match certificate export format/logic
        participants
          .sort((a, b) => b.overallTotal - a.overallTotal)
          .slice(0, 5)
          .forEach((p, i) => {
            // Check for substitution
            const isSubstituted = p.substitute && p.substitute[event.name];
            const studentName = isSubstituted
              ? p.substitute[event.name].newStudentName
              : p.studentFullName;

            const studentGender = isSubstituted
              ? p.substitute[event.name].newStudentGender
              : p.gender;

            const studentDOB = isSubstituted
              ? p.substitute[event.name].newStudentDOB
              : p.dateOfBirth;

            const studentGroup = isSubstituted
              ? p.substitute[event.name].newStudentGroup
              : p.studentGroup;

            allRows.push({
              eventName: event.name,
              Rank: i + 1,
              ...p,
              studentFullName: studentName,
              gender: studentGender,
              dateOfBirth: studentDOB,
              studentGroup: studentGroup,
              OverallTotal: parseFloat(p.overallTotal ?? 0).toFixed(2),
            });
          });
      }

      // ===============================
      // GROUP EVENTS
      // ===============================
      else {
        const grouped = {};

        participants.forEach((p) => {
          const key = p.district || 'Unknown';

          if (!grouped[key]) {
            grouped[key] = {
              district: key,
              members: [],
              judgeWiseTotal: {},
              score: {},
            };
            judgeIds.forEach((jid) => (grouped[key].judgeWiseTotal[jid] = 0));
          }

          // In group export, we flatten members.
          // Store raw participant data if needed, but here we just need to group them first.
          grouped[key].members.push({
            ...p,
            name: p.studentFullName || 'Unknown',
            id: p.studentId || 'Unknown ID',
          });
        });

        // Assign score from first participant found for that group
        participants.forEach((p) => {
          const key = p.district || 'Unknown';
          if (
            !grouped[key].score ||
            Object.keys(grouped[key].score).length === 0
          ) {
            grouped[key].score = p.score || {};
          }
        });

        Object.values(grouped).forEach((g) => {
          judgeIds.forEach((jid) => {
            let jTotal = 0;
            criteriaList.forEach((c) => {
              const s = parseFloat(g.score?.[event.name]?.[jid]?.[c] ?? 0);
              jTotal += s;
            });
            g.judgeWiseTotal[jid] = jTotal;
          });

          g.overallTotal = Object.values(g.judgeWiseTotal).reduce(
            (a, b) => a + b,
            0,
          );
        });

        Object.values(grouped)
          .sort((a, b) => {
            if (b.overallTotal !== a.overallTotal) {
              return b.overallTotal - a.overallTotal; // score DESC
            }
            return (a.district ?? '').localeCompare(b.district ?? ''); // district ASC
          })
          .slice(0, 5)
          .forEach((g, i) => {
            const rank = i + 1;
            // Flatten members
            g.members.forEach((member) => {
              allRows.push({
                eventName: event.name,
                Rank: rank,
                ...member,
                // Map to standard keys
                studentFullName: member.name,
                studentId: member.id,
                district: g.district || 'Unknown',
                OverallTotal: parseFloat(g.overallTotal ?? 0).toFixed(2),
              });
            });
          });
      }
    }

    if (allRows.length === 0) return;

    // Collect all unique keys
    const allKeys = new Set();
    allRows.forEach((item) => {
      Object.keys(item).forEach((key) => {
        const val = item[key];
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
          return;
        }
        allKeys.add(key);
      });
    });

    const headers = Array.from(allKeys).sort();
    // Use the same prioritized list as the individual/group export
    const prioritized = [
      'eventName',
      'Rank',
      'studentFullName',
      'studentId',
      'district',
      'samithiName',
      'studentGroup',
      'OverallTotal',
    ];

    const sortedHeaders = [
      ...prioritized.filter((h) => headers.includes(h)),
      ...headers.filter((h) => !prioritized.includes(h)),
    ];

    // CSV Escape helper
    const esc = (v) => {
      if (v == null) return '';
      if (Array.isArray(v)) return `"${v.join('; ')}"`;
      const s = String(v);
      return s.includes(',') || s.includes('\n') || s.includes('"')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    // ---------- DOWNLOAD ----------
    const csv =
      '\uFEFF' +
      [
        sortedHeaders.map(esc).join(','),
        ...allRows.map((row) =>
          sortedHeaders.map((header) => esc(row[header])).join(','),
        ),
      ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Final_Results.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  return !isLoading && user && filteredData ? (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
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

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Search Events
                </label>
                <input
                  id="search"
                  className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 p-2 border"
                  placeholder="Search by event name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <label
                  htmlFor="group"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Filter by Group
                </label>
                <select
                  id="group"
                  className="w-full border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 p-2 border"
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                >
                  <option value="">All Groups</option>
                  {groups.map((group, index) => (
                    <option
                      key={index}
                      value={group}
                    >
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Download Results */}
          <div className="flex justify-end mb-6">
            <button
              onClick={downloadFinalResults}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Download Final Results
            </button>
          </div>

          {/* Content Section */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Event Details
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Judges
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Criteria Summary
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length > 0 ? (
                    filteredData.map((event, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-bold text-gray-900">
                              {event.name}
                            </span>
                            {eventTieAlerts[event.name] && (
                              <span
                                className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200"
                                title={formatTieSummary(
                                  eventTieAlerts[event.name],
                                )}
                              >
                                {formatTieSummary(eventTieAlerts[event.name])}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {event.group.map((group, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {group}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {event.judgeEmailList.map((judge, idx) => {
                              const password = judge
                                .toString()
                                .replace('@slts.cbe', '@2311pass26');
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                                >
                                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-lg font-medium">
                                    {judge}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-mono">
                                      {password}
                                    </span>
                                    <button
                                      className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                                      title="Copy credentials"
                                      onClick={() => {
                                        const message = `Email: ${judge}\nPassword: ${password}`;
                                        navigator.clipboard.writeText(message);
                                        setCopiedJudge(judge);
                                        setTimeout(
                                          () => setCopiedJudge(null),
                                          2000,
                                        );
                                      }}
                                    >
                                      {copiedJudge === judge ? (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4 text-green-600"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      ) : (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-4 w-4"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                          />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {Object.entries(event.evalCriteria).length > 0 ? (
                              <div className="text-sm">
                                <div className="space-y-1">
                                  {Object.entries(event.evalCriteria).map(
                                    ([criteria, marks], cIdx) => (
                                      <div
                                        key={cIdx}
                                        className="flex justify-between items-center text-gray-600 border-b border-gray-100 last:border-0 pb-1 last:pb-0"
                                      >
                                        <span className="font-medium pr-4">
                                          {criteria}
                                        </span>
                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">
                                          {marks} pts
                                        </span>
                                      </div>
                                    ),
                                  )}
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center font-bold text-gray-900">
                                  <span>Total</span>
                                  <span>
                                    {Object.values(event.evalCriteria).reduce(
                                      (a, b) => a + b,
                                      0,
                                    )}{' '}
                                    pts
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">
                                No criteria set
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              className="bg-cyan-100 text-cyan-900 hover:bg-cyan-200 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors w-full sm:w-auto text-center"
                              onClick={() => {
                                setEventNameBuffer(event.name);
                                setCriteriaBuffer(
                                  Object.entries(event.evalCriteria),
                                );
                                setCIsOpen(true);
                              }}
                            >
                              Update Criteria
                            </button>
                            <a
                              className="bg-lime-100 text-lime-900 hover:bg-lime-200 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors w-full sm:w-auto text-center block"
                              href={`/admin/event/${event.name.includes('GROUP') ? 'group' : 'individual'}?event=${encodeURIComponent(event.name)}`}
                            >
                              Leaderboard
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No events found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={cIsOpen}
        onClose={() => setCIsOpen(false)}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm"
          aria-hidden="true"
        />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-2xl w-full rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-row justify-between items-center bg-gray-50">
              <DialogTitle className="text-lg font-bold text-gray-900">
                Update Judging Criteria
              </DialogTitle>
              <button
                onClick={() => setCIsOpen(false)}
                className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Event Name
                </h3>
                <p className="text-lg font-bold text-gray-900">
                  {eventNameBuffer}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  <div className="col-span-7">Criteria Name</div>
                  <div className="col-span-3">Marks</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>

                {criteriaBuffer.map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 items-center"
                  >
                    <div className="col-span-7">
                      <input
                        type="text"
                        className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                        placeholder="Criteria description"
                        value={criteriaBuffer[index][0]}
                        onChange={(e) => {
                          const _criteriaBuffer = [...criteriaBuffer];
                          _criteriaBuffer[index][0] = e.target.value;
                          setCriteriaBuffer(_criteriaBuffer);
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                        placeholder="0"
                        value={criteriaBuffer[index][1] ?? 0}
                        onChange={(e) => {
                          const _criteriaBuffer = [...criteriaBuffer];
                          _criteriaBuffer[index][1] = e.target.value.toString();
                          setCriteriaBuffer(_criteriaBuffer);
                        }}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="Remove criteria"
                        onClick={() => {
                          const _criteriaBuffer = [...criteriaBuffer];
                          _criteriaBuffer.splice(index, 1);
                          setCriteriaBuffer(_criteriaBuffer);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-700">
                  Total Marks:{' '}
                  <span className="text-lg font-bold text-gray-900 ml-2">
                    {criteriaBuffer
                      .map((c) => c[1])
                      .reduce((a, b) => a + parseInt(b || 0), 0)}
                  </span>
                </div>
                <button
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  onClick={() => {
                    setCriteriaBuffer([...criteriaBuffer, ['', 0]]);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Criteria
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                onClick={() => setCIsOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                onClick={() => {
                  setIsLoading(true);
                  const _criteria = {};
                  criteriaBuffer.forEach((c) => {
                    if (c[0].trim()) {
                      _criteria[c[0]] = c[1];
                    }
                  });

                  updateCrieria(eventNameBuffer, _criteria).then((res) => {
                    if (res) {
                      setCIsOpen(false);
                      router.refresh();
                    }
                  });
                }}
              >
                Save Changes
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Loading event data...</p>
      </div>
    </div>
  );
}
