"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/app/_util/initApp";
import { reverseDistrictCode } from "@/app/_util/maps";
import { getDistrcitData } from "@/app/_util/data";
import secureLocalStorage from "react-secure-storage";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [district, setDistrict] = useState(null);
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  // filters.
  const [events, setEvents] = useState([]);
  const [filterEvent, setFilterEvent] = useState("");

  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!secureLocalStorage.getItem("user")) {
      router.push("/");
    }

    const user = JSON.parse(secureLocalStorage.getItem("user"));
    if (
      Object.keys(reverseDistrictCode).indexOf(
        user.role.toString().toUpperCase()
      ) === -1
    ) {
      router.push("/");
    } else {
      setDistrict(reverseDistrictCode[user.role.toString().toUpperCase()]);
      setUser(user);
      getDistrcitData(
        reverseDistrictCode[user.role.toString().toUpperCase()]
      ).then((_data) => {
        // Handle Logout.
        if (_data == null || _data.length != 3) {
          router.push("/");
        }

        setData(_data[0]);
        setFilteredData(_data[0]);
        setEvents(_data[1]);
        setGroups(_data[2]);
      });
    }
  }, [router]);

  useEffect(() => {
    if (data) {
      setFilteredData(
        data.filter((row) => {
          return (
            (filterEvent === "" ||
              row.registeredEvents.includes(filterEvent)) &&
            (filterGroup === "" || row.studentGroup === filterGroup) &&
            (searchQuery === "" ||
              row.studentFullName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              row.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        })
      );
    }
  }, [data, filterEvent, filterGroup, searchQuery]);

  return user && filteredData ? (
    <>
      {console.log(filteredData)}
      <div className="flex flex-col justify-center w-fit min-w-[95%] ml-auto mr-auto">
        <div className="rounded-2xl p-4 m-4 bg-white border overflow-x-auto justify-between flex flex-row">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
            <p className="text-gray-700">{user.email}</p>
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

        <div className="flex flex-row flex-wrap gap-4 m-4 justify-center overflow-x-auto">
          <div className="bg-white p-4 rounded-2xl border">
            <div className="flex flex-col gap-4">
              <div>
                <input
                  id="search"
                  className="border p-2 rounded-2xl w-full"
                  placeholder="Search by name or student ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-row flex-wrap gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="event">Event</label>
                  <select
                    id="event"
                    className="border p-2 rounded-2xl"
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                  >
                    <option value="">All</option>
                    {events.map((event, index) => (
                      <option key={index} value={event}>
                        {event}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="group">Group</label>
                  <select
                    id="group"
                    className="border p-2 rounded-2xl"
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                  >
                    <option value="">All</option>
                    {groups.map((group, index) => (
                      <option key={index} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-row flex-wrap gap-4 m-4 justify-center overflow-x-auto">
          <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
            <div>
              <p className="text-lg font-bold">Total Registrations</p>
              <p className="text-sm font-semibold">Participants</p>
            </div>
            <div className="flex justify-around gap-3">
              <div className="pt-2">
                <p className="text-sm font-bold">Male</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) =>
                      acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0),
                    0
                  )}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-sm font-bold">Female</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) =>
                      acc + parseInt((row.gender == "Female" ? 1 : 0) ?? 0),
                    0
                  )}
                </p>
              </div>
              <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                <p className="text-sm font-bold">Total</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) =>
                      acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0),
                    0
                  ) +
                    filteredData.reduce(
                      (acc, row) =>
                        acc + parseInt((row.gender == "Female" ? 1 : 0) ?? 0),
                      0
                    )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
            <div>
              <p className="text-lg font-bold">Total Accompanying Adults</p>
              <p className="text-sm font-semibold">Non-Participants</p>
            </div>
            <div className="flex justify-around gap-3">
              <div className="pt-2">
                <p className="text-sm font-bold">Male</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) => acc + parseInt(row.numMaleAccompanying ?? 0),
                    0
                  )}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-sm font-bold">Female</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) =>
                      acc + parseInt(row.numFemaleAccompanying ?? 0),
                    0
                  )}
                </p>
              </div>
              <div className="pt-2">
                <p className="text-sm font-bold">Children</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) =>
                      acc + parseInt(row.numNonParticipatingSiblings ?? 0),
                    0
                  )}
                </p>
              </div>
              <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                <p className="text-sm font-bold">Total</p>
                <p className="text-4xl font-bold">
                  {filteredData.reduce(
                    (acc, row) => acc + parseInt(row.numMaleAccompanying ?? 0),
                    0
                  ) +
                    filteredData.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numFemaleAccompanying ?? 0),
                      0
                    ) +
                    filteredData.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numNonParticipatingSiblings ?? 0),
                      0
                    )}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
            <p className="text-lg font-bold">Accommodation Logistics</p>
            <div className="flex flex-row flex-nowrap">
              <div className="pr-2">
                <div>
                  <p className="text-sm font-semibold">Non-Participants</p>
                </div>
                <div className="flex justify-around gap-3">
                  <div className="pt-2">
                    <p className="text-sm font-bold">Male</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            row.numMaleAccompanyingNeedAccommodation ?? 0
                          ),
                        0
                      )}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-bold">Female</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            row.numFemaleAccompanyingNeedAccommodation ?? 0
                          ),
                        0
                      )}
                    </p>
                  </div>
                  <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                    <p className="text-sm font-bold">Total</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            row.numMaleAccompanyingNeedAccommodation ?? 0
                          ),
                        0
                      ) +
                        filteredData.reduce(
                          (acc, row) =>
                            acc +
                            parseInt(
                              row.numFemaleAccompanyingNeedAccommodation ?? 0
                            ),
                          0
                        )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-l px-2">
                <div>
                  <p className="text-sm font-semibold">Participants</p>
                </div>
                <div className="flex justify-around gap-3">
                  <div className="pt-2">
                    <p className="text-sm font-bold">Male</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            (row.needsAccommodation == "Yes" &&
                            row.gender == "Male"
                              ? 1
                              : 0) ?? 0
                          ),
                        0
                      )}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-bold">Female</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            (row.needsAccommodation == "Yes" &&
                            row.gender == "Female"
                              ? 1
                              : 0) ?? 0
                          ),
                        0
                      )}
                    </p>
                  </div>
                  <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                    <p className="text-sm font-bold">Total</p>
                    <p className="text-4xl font-bold">
                      {filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            (row.needsAccommodation == "Yes" &&
                            row.gender == "Male"
                              ? 1
                              : 0) ?? 0
                          ),
                        0
                      ) +
                        filteredData.reduce(
                          (acc, row) =>
                            acc +
                            parseInt(
                              (row.needsAccommodation == "Yes" &&
                              row.gender == "Female"
                                ? 1
                                : 0) ?? 0
                            ),
                          0
                        )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-l pl-2">
                <div>
                  <p className="text-sm font-semibold">Overall</p>
                </div>
                <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                  <p className="text-sm font-bold">Total</p>
                  <p className="text-4xl font-bold">
                    {filteredData.reduce(
                      (acc, row) =>
                        acc +
                        parseInt(
                          (row.needsAccommodation == "Yes" &&
                          row.gender == "Male"
                            ? 1
                            : 0) ?? 0
                        ),
                      0
                    ) +
                      filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            (row.needsAccommodation == "Yes" &&
                            row.gender == "Female"
                              ? 1
                              : 0) ?? 0
                          ),
                        0
                      ) +
                      filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            row.numMaleAccompanyingNeedAccommodation ?? 0
                          ),
                        0
                      ) +
                      filteredData.reduce(
                        (acc, row) =>
                          acc +
                          parseInt(
                            row.numFemaleAccompanyingNeedAccommodation ?? 0
                          ),
                        0
                      )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto m-4">
          <table className="table-auto w-full mt-6 border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-4 py-2 border">Student Details</th>
                <th className="px-4 py-2 border">BalVikas Details</th>
                <th className="px-4 py-2 border">
                  Arrival & Departure Logistics
                </th>
                <th className="px-4 py-2 border">Accompany Details</th>
                <th className="px-4 py-2 border">Accommodation Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={index}
                  className="bg-white hover:bg-blue-50 text-bold transition duration-200"
                >
                  <td className="px-4 py-2 border max-w-[160px]">
                    <p className="font-bold">{row.studentFullName ?? "-"}</p>
                    <p className="text-xs">
                      {row.gender ?? "-"} - {row.dateOfBirth ?? "-"}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <p className="text-xs font-bold bg-[#c4ffc2] text-[#07210d] p-1 px-2 rounded-2xl w-fit">
                        {row.studentId ?? "-"}
                      </p>
                      <p className="text-xs font-bold bg-[#bad1ff] text-[#090e2d] p-1 px-2 rounded-2xl w-fit">
                        {row.studentGroup ?? "-"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-2 border max-w-[200px]">
                    <p className="font-bold">{row.district ?? "-"}</p>
                    <p className="text-xs">{row.samithiName ?? "-"}</p>
                    <p className="text-xs">
                      DOJ BV: {row.dateOfJoiningBalvikas ?? "-"}{" "}
                      {row.yearOfJoiningBalvikas ?? "-"}
                    </p>
                    {row.studentGroup === "Group 3" && (
                      <p className="text-xs">
                        Passed group 2: {row.hasPassedGroup2Exam ?? "-"}
                      </p>
                    )}
                    <div className="flex flex-wrap mt-2 gap-1">
                      {row.registeredEvents.map((event, index) => (
                        <p
                          key={index}
                          className="text-xs bg-green-200 text-green-800 font-bold rounded-xl p-1 px-2 w-fit"
                        >
                          {event ?? "-"}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="border max-w-[200px]">
                    <div className="flex flex-row justify-around items-center gap-1">
                      <div className="border rounded-2xl p-2">
                        <p className="text-xs font-semibold">{"Arrival"}</p>
                        <p className="text-xs font-bold">
                          {row.arrivalDate ?? "-"} - {row.arrivalTime ?? "-"}
                        </p>
                        <p className="text-xs">
                          {row.needsPickup === "Yes"
                            ? "Needs pickup."
                            : "Pickup not needed."}
                        </p>
                        {row.needsPickup === "Yes" && (
                          <div className="bg-purple-100 p-2 rounded-xl mt-2">
                            <p className="text-xs">
                              Mode: {row.modeOfTravel ?? "-"}
                            </p>
                            <p className="text-xs">
                              Pickup Point: {row.pickupPoint ?? "-"}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="border rounded-2xl p-2">
                        <p className="text-xs font-semibold">{"Departure"}</p>
                        <p className="text-xs font-bold">
                          {row.departureDate ?? "-"} -{" "}
                          {row.departureTime ?? "-"}
                        </p>
                        <p className="text-xs">
                          {row.needsDrop === "Yes"
                            ? "Needs drop."
                            : "Drop not needed."}
                        </p>
                        {row.needsDrop === "Yes" && (
                          <div className="bg-purple-100 p-2 rounded-xl mt-2">
                            <p className="text-xs">
                              Mode: {row.modeOfTravelForDrop ?? "-"}
                            </p>
                            <p className="text-xs">
                              Drop Point: {row.dropOffPoint ?? "-"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 border">
                    <p className="text-xs">
                      {row.hasAccompanyingAdults === "Yes"
                        ? "Has Accompanying adults."
                        : "No Accompany."}
                    </p>
                    <div className="mt-2 bg-purple-100 p-2 rounded-2xl">
                      <p className="text-xs font-bold">
                        {row.accompanyingPersonName ?? "-"}
                      </p>
                      <p className="text-xs">
                        {row.accompanyingPersonGender ?? "-"} -{" "}
                        {row.accompanyingPersonAge ?? "-"} yrs
                      </p>
                      <p className="text-xs">
                        {row.accompanyingPersonRelation ?? "-"}
                      </p>
                      <p className="text-xs">
                        {row.accompanyingPersonContact ?? "-"}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">
                          {row.numMaleAccompanying ?? "0"} male
                        </p>
                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">
                          {row.numFemaleAccompanying ?? "0"} female
                        </p>
                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">
                          {row.numNonParticipatingSiblings ?? "0"} children
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 border">
                    <div className="mt-2 bg-purple-100 p-2 rounded-2xl">
                      <p className="text-xs font-bold">Check-In Details</p>
                      <p className="text-xs">
                        {row.checkInDate ?? "-"} - {row.checkInTime ?? "-"}
                      </p>
                      <p className="text-xs">
                        {row.checkOutDate ?? "-"} - {row.checkOutTime ?? "-"}
                      </p>

                      <p className="text-xs mt-2 font-semibold">
                        For student: {row.needsAccommodation ?? "-"}
                      </p>
                      <p className="text-xs">
                        Allergies: {row.foodAllergies ?? "-"}
                      </p>
                      <div className="flex gap-1 flex-wrap mt-2">
                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">
                          {row.numMaleAccompanyingNeedAccommodation ?? "0"} male
                        </p>
                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">
                          {row.numFemaleAccompanyingNeedAccommodation ?? "0"}{" "}
                          female
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  ) : (
    <div className="flex h-screen items-center justify-center">
      <p className="text-xl font-semibold">Loading...</p>
    </div>
  );
}
