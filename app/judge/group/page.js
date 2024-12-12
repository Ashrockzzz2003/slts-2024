"use client";

import { getJudgeGroupEventData } from "@/app/_util/data";
import { auth } from "@/app/_util/initApp";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { markGroupScore } from "@/app/_util/data";
import secureLocalStorage from "react-secure-storage";

export default function JudgeGroupPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [eventMetadata, setEventMetadata] = useState(null);
  const [participants, setParticipants] = useState(null);
  const [filteredParticipants, setFilteredParticipants] = useState(null);

  const [scoreBuffer, setScoreBuffer] = useState([]);
  const [scoreMode, setScoreMode] = useState({});
  const [commentBuffer, setCommentBuffer] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!secureLocalStorage.getItem("user")) {
      router.push("/");
    }

    const user = JSON.parse(secureLocalStorage.getItem("user"));
    if (user?.role !== "judge" || !user.event) {
      router.push("/");
    } else {
      setUser(user);
      getJudgeGroupEventData(user.event).then((_data) => {
        if (_data == null || _data.length != 2) {
          router.push("/");
        }

        setParticipants(_data[0]);
        setEventMetadata(_data[1]);
      });
    }
  }, [router]);

  return user && eventMetadata && participants ? (
    <>
      <div className="flex flex-col justify-center w-fit min-w-[95%] ml-auto mr-auto">
        <div className="rounded-2xl p-4 m-2 bg-white border overflow-x-auto justify-between flex flex-row">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
            <p className="text-gray-700 mt-2">{user.email}</p>
            <p className="font-bold">{user.event}</p>
          </div>
          <div>
            <button
              className="bg-[#ffcece] text-[#350b0b] font-bold px-4 py-1 rounded-xl"
              onClick={() => {
                auth.signOut();
                secureLocalStorage.clear();
                router.push("/");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-center w-fit min-w-[95%] ml-auto mr-auto">
          <div className="rounded-2xl p-4 bg-white border overflow-x-auto">
            <h1 className="text-2xl font-bold">{eventMetadata.name}</h1>
            <p className="text-md">{Object.keys(participants).length} Teams</p>
            <div className="flex flex-row flex-wrap gap-1 mt-1">
              {eventMetadata.group.map((group, index) => (
                <p
                  key={index}
                  className="bg-gray-200 text-gray-800 font-semibold px-2 py-1 rounded-xl w-fit"
                >
                  {group}
                </p>
              ))}
            </div>

            {/* Evaluation Criteria */}
            <h2 className="text-xl font-bold mt-6">Evaluation Criteria</h2>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Criteria</th>
                  <th className="border px-4 py-2">Max Marks</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(eventMetadata.evalCriteria).map(
                  ([key, value], index) => (
                    <tr key={index}>
                      <td className="border px-4 py-2">{key}</td>
                      <td className="border px-4 py-2">{value}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col justify-center w-fit min-w-[95%] ml-auto mr-auto">
          <div className="rounded-2xl p-4 my-4 bg-white border overflow-x-auto">
            <div className="flex flex-row justify-between">
              <h1 className="text-2xl font-bold">Participants</h1>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              {Object.entries(participants).map(([district, val], index) => (
                <div
                  key={index}
                  className="rounded-2xl  px-4 bg-gray-100 border"
                >
                  <div className="flex flex-row justify-between">
                    <div className="flex flex-col justify-between">
                      {val.map((participant, index) => (
                        <div className="mt-4" key={index}>
                          <div className="flex flex-row justify-between">
                            <div>
                              <h2 className="text-xl font-bold">
                                {participant.studentId}
                              </h2>
                              <p className="text-xs">
                                {participant.gender ?? "-"} -{" "}
                                {participant.dateOfBirth ?? "-"}
                              </p>
                              <p className="text-xs rounded-2xl w-fit">
                                {participant.studentGroup ?? "-"}
                              </p>
                            </div>
                          </div>
                          <hr />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      {/* TODO: Scoring for GROUP events. */}
                      {val[0].score &&
                        val[0].score[eventMetadata.name] &&
                        val[0].score[eventMetadata.name][user.id] ? (
                        <div className="mt-2 flex flex-col">
                          <button
                            className="bg-[#ffcece] text-[#350b0b] font-semibold px-4 py-1 rounded-xl mt-2"
                            onClick={() => {
                              let _scoreMode = {};

                              for (let region in participants) {
                                participants[region].forEach((p) => {
                                  _scoreMode[p.studentId] = false;
                                });
                              }

                              val.forEach((p) => {
                                _scoreMode[p.studentId] = true;
                              });

                              setScoreBuffer(
                                Object.entries(
                                  val[0].score[eventMetadata.name][user.id]
                                ).map(([key, val]) => [key, val])
                              );

                              setScoreMode(_scoreMode);
                              setCommentBuffer(
                                val[0].comment[eventMetadata.name][user.id] ??
                                ""
                              );
                            }}
                          >
                            Edit Score
                          </button>
                        </div>
                      ) : scoreMode[val[0].studentId] == false ||
                        scoreMode[val[0].studentId] == undefined ? (
                        <button
                          className="bg-[#ffd8a1] text-[#35250b] font-semibold px-4 py-1 rounded-xl mt-2"
                          onClick={() => {
                            let _scoreMode = {};
                            for (let region in participants) {
                              participants[region].forEach((p) => {
                                _scoreMode[p.studentId] = false;
                              });
                            }

                            val.forEach((p) => {
                              _scoreMode[p.studentId] = true;
                            });
                            setScoreBuffer(
                              Object.entries(eventMetadata.evalCriteria).map(
                                ([key, _]) => [key, 0]
                              )
                            );
                            setScoreMode(_scoreMode);
                            setCommentBuffer("");
                          }}
                        >
                          Evaluate
                        </button>
                      ) : (
                        <p className="bg-[#a1fffd] text-[#0b3533] font-semibold px-4 py-1 rounded-xl mt-2">
                          Evaluating
                        </p>
                      )}
                    </div>
                  </div>
                  {scoreMode[val[0].studentId] && eventMetadata.evalCriteria ? (
                    <div>
                      <hr className="my-4" />
                      <div className="flex flex-col gap-2 justify-center items-stretch align-middle">
                        {scoreBuffer.map(([key, val], index) => (
                          <div
                            key={index}
                            className="flex flex-row justify-between items-center"
                          >
                            <label className="text-sm">{key}</label>
                            <input
                              type="number"
                              className="border p-2 rounded-lg text-md"
                              max={eventMetadata.evalCriteria[key]}
                              min={0}
                              value={val}
                              onChange={(e) => {
                                if (e.target.value < 0) {
                                  e.target.value = 0;
                                } else if (e.target.value > 10) {
                                  e.target.value = 10;
                                }
                                const newBuffer = [...scoreBuffer];
                                newBuffer[index][1] = e.target.value;
                                setScoreBuffer(newBuffer);
                              }}
                            />
                          </div>
                        ))}

                        <hr className="border-dashed mt-2" />
                        <div className="flex flex-row justify-between align-middle">
                          <label className="text-sm">Total</label>
                          <p className="text-md font-semibold">
                            {scoreBuffer.reduce(
                              (a, b) =>
                                (a == "" ? 0 : a) +
                                parseInt(b[1] == "" ? 0 : b[1]),
                              0
                            )}
                          </p>
                        </div>

                        <hr className="border-dashed" />
                        <div className="flex flex-col gap-2">
                          <label className="text-sm">Comments (Optional)</label>
                          <textarea
                            className="border p-2 rounded-lg"
                            value={commentBuffer}
                            onChange={(e) => setCommentBuffer(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-row justify-between gap-1">
                          <button
                            className="bg-[#ffe0e0] text-[#350b0b] font-semibold px-4 py-1 rounded-xl mt-2 w-full"
                            onClick={() => {
                              setScoreBuffer([]);

                              let _scoreMode = {};
                              for (let region in participants) {
                                participants[region].forEach((p) => {
                                  _scoreMode[p.studentId] = false;
                                });
                              }
                              setScoreMode(_scoreMode);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="bg-[#c2fca2] text-[#0b350d] font-semibold px-4 py-1 rounded-xl mt-2 w-full"
                            onClick={() => {
                              markGroupScore(
                                val[0].district,
                                eventMetadata.name,
                                user.id,
                                Object.fromEntries(scoreBuffer),
                                commentBuffer
                              ).then((res) => {
                                if (res) {
                                  let _scoreMode = {};

                                  for (let region in participants) {
                                    participants[region].forEach((p) => {
                                      _scoreMode[p.studentId] = false;
                                    });
                                  }
                                  setScoreMode(_scoreMode);

                                  let _participants = [];

                                  for (let region in participants) {
                                    _participants.push(...participants[region]);
                                  }

                                  const indices = _participants.map(
                                    (p, index) => p.district === val[0].district
                                  );

                                  for (
                                    let i = 0;
                                    i < _participants.length;
                                    i++
                                  ) {
                                    if (indices[i]) {
                                      _participants[i].score =
                                        _participants[i].score ?? {};
                                      _participants[i].score[
                                        eventMetadata.name
                                      ] =
                                        _participants[i].score[
                                        eventMetadata.name
                                        ] ?? {};
                                      _participants[i].score[
                                        eventMetadata.name
                                      ][user.id] = {};

                                      scoreBuffer.forEach(([key, val]) => {
                                        _participants[i].score[
                                          eventMetadata.name
                                        ][user.id][key] = val;
                                      });

                                      _participants[i].comment =
                                        _participants[i].comment ?? {};
                                      _participants[i].comment[
                                        eventMetadata.name
                                      ] =
                                        _participants[i].comment[
                                        eventMetadata.name
                                        ] ?? {};
                                      _participants[i].comment[
                                        eventMetadata.name
                                      ][user.id] = commentBuffer;
                                    }
                                  }

                                  let updatedParticipants = {};
                                  for (let region in participants) {
                                    updatedParticipants[region] =
                                      _participants.filter(
                                        (p) => p.district === region
                                      );
                                  }

                                  setParticipants(updatedParticipants);
                                  console.log(updatedParticipants);
                                }
                              });
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : val[0].score &&
                    val[0].score[eventMetadata.name] &&
                    val[0].score[eventMetadata.name][user.id] ? (
                    <div className="flex flex-col gap-2 mt-4">
                      <hr />
                      <h2 className="text-lg font-bold">Score</h2>
                      {Object.entries(
                        val[0].score[eventMetadata.name][user.id]
                      ).map(([key, val], index) => (
                        <div
                          key={index}
                          className="flex flex-row justify-between items-center"
                        >
                          <label className="text-sm">{key}</label>
                          <p className="text-md font-semibold">{val}</p>
                        </div>
                      ))}
                      <hr className="border-dashed" />
                      <div className="flex flex-row justify-between items-center">
                        <label className="text-sm">Total</label>
                        <p className="text-md font-semibold">
                          {Object.values(
                            val[0].score[eventMetadata.name][user.id]
                          ).reduce((a, b) => a + parseInt(b), 0)}
                        </p>
                      </div>
                      <hr className="border-dashed" />
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold">Comments</label>
                        <p className="text-md">
                          {val[0].comment[eventMetadata.name][user.id] ?? "-"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    <div className="flex h-screen items-center justify-center">
      <p className="text-xl font-semibold">Loading...</p>
    </div>
  );
}