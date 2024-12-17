"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/app/_util/initApp";
import { getRegistrationData } from "@/app/_util/data";
import secureLocalStorage from "react-secure-storage";

export default function DistrictStats() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  const [districts, setDistricts] = useState([]);
  const [districtData, setDistrictData] = useState([]);

  const [checkInDateOptions, setCheckInDateOptions] = useState([]);
  const [filterCheckInDate, setFilterCheckInDate] = useState("");

  const [checkOutDateOptions, setCheckOutDateOptions] = useState([]);
  const [filterCheckOutDate, setFilterCheckOutDate] = useState("");

  useEffect(() => {
    const savedUser = secureLocalStorage.getItem("user");
    if (!savedUser) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    getRegistrationData().then((_data) => {
      if (!_data || _data.length !== 8) {
        router.push("/");
        return;
      }

      setData(_data[0]);
      setDistricts(_data[1]);
      setCheckInDateOptions(_data[6]);
      setCheckOutDateOptions(_data[7]);

      const organizedData = _data[1].map((district) => ({
        district,
        rows: _data[0].filter((row) => row.district === district),
      }));

      setDistrictData(organizedData);
    });
  }, [router]);

  useEffect(() => {
    const filtered = districtData.map((item) => ({
      district: item.district,
      rows: item.rows.filter(
        (row) =>
          (filterCheckInDate === "" || row.checkInDate === filterCheckInDate) &&
          (filterCheckOutDate === "" || row.checkOutDate === filterCheckOutDate)
      ),
    }));

    setFilteredData(filtered);
  }, [districtData, filterCheckInDate, filterCheckOutDate]);

  return user && data ? (
    <div className="flex flex-col justify-center w-fit mx-auto">
      <div className="rounded-2xl p-4 m-4 bg-white border flex flex-row justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
          <p className="text-gray-700">{user.email}</p>
        </div>
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

      <div className="flex flex-row flex-wrap gap-8 m-8 justify-center overflow-x-auto">
        <div>
          <label htmlFor="checkInDate">
            <b>Check In Date</b>
          </label>
          <select
            id="checkInDate"
            className="border p-2 rounded-2xl"
            value={filterCheckInDate}
            onChange={(e) => setFilterCheckInDate(e.target.value)}
          >
            <option value="">All</option>
            {checkInDateOptions.map((date, index) => (
              <option key={index} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="checkOutDate">
            <b>Check Out Date</b>
          </label>
          <select
            id="checkOutDate"
            className="border p-2 rounded-2xl"
            value={filterCheckOutDate}
            onChange={(e) => setFilterCheckOutDate(e.target.value)}
          >
            <option value="">All</option>
            {checkOutDateOptions.map((date, index) => (
              <option key={index} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredData.map(({ district, rows }, index) => (
        <div key={index}>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{district}</h1>
          <div className="flex flex-row flex-wrap gap-4 m-4 justify-center overflow-x-auto">
            <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
              <div>
                <p className="text-lg font-bold">Total Registrations</p>
                <p className="text-sm font-semibold text-gray-500">
                  Participants
                </p>
              </div>
              <div className="flex justify-around gap-3">
                <div className="pt-2">
                  <p className="text-sm font-bold">Male</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0),
                      0
                    )}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-bold">Female</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt((row.gender == "Female" ? 1 : 0) ?? 0),
                      0
                    )}
                  </p>
                </div>
                <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                  <p className="text-sm font-bold">Total</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0),
                      0
                    ) +
                      rows.reduce(
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
                <p className="text-sm font-semibold text-gray-500">
                  Non-Participants
                </p>
              </div>
              <div className="flex justify-around gap-3">
                <div className="pt-2">
                  <p className="text-sm font-bold">Male</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numMaleAccompanying ?? 0),
                      0
                    )}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-bold">Female</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numFemaleAccompanying ?? 0),
                      0
                    )}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-bold">Children</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numNonParticipatingSiblings ?? 0),
                      0
                    )}
                  </p>
                </div>
                <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                  <p className="text-sm font-bold">Total</p>
                  <p className="text-4xl font-bold">
                    {rows.reduce(
                      (acc, row) =>
                        acc + parseInt(row.numMaleAccompanying ?? 0),
                      0
                    ) +
                      rows.reduce(
                        (acc, row) =>
                          acc + parseInt(row.numFemaleAccompanying ?? 0),
                        0
                      ) +
                      rows.reduce(
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
                    <p className="text-sm font-semibold text-gray-500">
                      Non-Participants
                    </p>
                  </div>
                  <div className="flex justify-around gap-3">
                    <div className="pt-2">
                      <p className="text-sm font-bold">Male</p>
                      <p className="text-4xl font-bold">
                        {rows.reduce(
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
                        {rows.reduce(
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
                    <p className="text-sm font-semibold text-gray-500">
                      Participants
                    </p>
                  </div>
                  <div className="flex justify-around gap-3">
                    <div className="pt-2">
                      <p className="text-sm font-bold">Male</p>
                      <p className="text-4xl font-bold">
                        {rows.reduce(
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
                        {rows.reduce(
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
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
              <p className="text-lg font-bold">Accommodation</p>
              <div>
                <div>
                  <p className="text-sm font-semibold text-gray-500">Overall</p>
                </div>
                <div className="flex justify-around gap-3">
                  <div className="pt-2">
                    <p className="text-sm font-bold">Male</p>
                    <p className="text-4xl font-bold">
                      {rows.reduce(
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
                        rows.reduce(
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
                      {rows.reduce(
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
                        rows.reduce(
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
                      {rows.reduce(
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
                        rows.reduce(
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
                        rows.reduce(
                          (acc, row) =>
                            acc +
                            parseInt(
                              row.numMaleAccompanyingNeedAccommodation ?? 0
                            ),
                          0
                        ) +
                        rows.reduce(
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
        </div>
      ))}
    </div>
  ) : (
    <div className="flex h-screen items-center justify-center">
      <p className="text-2xl font-semibold">Loading...</p>
    </div>
  );
}
