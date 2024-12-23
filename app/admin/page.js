"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/app/_util/initApp";
import { getRegistrationData } from "@/app/_util/data";
import secureLocalStorage from "react-secure-storage";

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [data, setData] = useState(null);
    const [filteredData, setFilteredData] = useState(null);

    // filters.
    const [districts, setDistricts] = useState([]);
    const [filterDistrict, setFilterDistrict] = useState("");

    const [events, setEvents] = useState([]);
    const [filterEvent, setFilterEvent] = useState("");

    const [groups, setGroups] = useState([]);
    const [filterGroup, setFilterGroup] = useState("");

    const [modeOfTravelOptions, setModeOfTravelOptions] = useState([]);
    const [filterModeOfTravel, setFilterModeOfTravel] = useState("");

    const [modeOfTravelForDropOptions, setModeOfTravelForDropOptions] = useState([]);
    const [filterModeOfTravelForDrop, setFilterModeOfTravelForDrop] = useState("");

    const [checkInDateOptions, setCheckInDateOptions] = useState([]);
    const [filterCheckInDate, setFilterCheckInDate] = useState("");

    const [checkOutDateOptions, setCheckOutDateOptions] = useState([]);
    const [filterCheckOutDate, setFilterCheckOutDate] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [filterNeedForPickup, setFilterNeedForPickup] = useState("");
    const [filterNeedForDrop, setFilterNeedForDrop] = useState("");
    const [filterNeedForAccommodation, setFilterNeedForAccommodation] = useState("");

    useEffect(() => {
        if (!secureLocalStorage.getItem('user')) {
            router.push('/');
        }

        const user = JSON.parse(secureLocalStorage.getItem('user'));
        setUser(user);
        getRegistrationData().then((_data) => {
            // Handle Logout.
            if (_data == null || _data.length != 8) {
                router.push('/');
            }

            setData(_data[0]);
            setFilteredData(_data[0]);

            setDistricts(_data[1]);
            setEvents(_data[2]);
            setGroups(_data[3]);
            setModeOfTravelOptions(_data[4]);
            setModeOfTravelForDropOptions(_data[5]);
            setCheckInDateOptions(_data[6]);
            setCheckOutDateOptions(_data[7]);
        });
    }, [router]);


    useEffect(() => {
        if (data) {
            setFilteredData(
                data.filter((row) => {
                    return (
                        (filterDistrict === "" || row.district === filterDistrict) &&
                        (filterEvent === "" || row.registeredEvents.includes(filterEvent)) &&
                        (filterGroup === "" || row.studentGroup === filterGroup) &&
                        (filterModeOfTravel === "" || row.modeOfTravel === filterModeOfTravel) &&
                        (filterModeOfTravelForDrop === "" || row.modeOfTravelForDrop === filterModeOfTravelForDrop) &&
                        (filterNeedForPickup === "" || (row.needsPickup.toString() === filterNeedForPickup)) &&
                        (filterNeedForDrop === "" || (row.needsDrop.toString() === filterNeedForDrop)) &&
                        (filterNeedForAccommodation === "" || (row.needsAccommodation.toString() === filterNeedForAccommodation)) &&
                        (filterCheckInDate === "" || row.checkInDate === filterCheckInDate) &&
                        (filterCheckOutDate === "" || row.checkOutDate === filterCheckOutDate) &&
                        (searchQuery === "" ||
                            row.studentFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            row.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                })
            );
        }
    }, [
        data,
        filterDistrict,
        filterEvent,
        filterGroup,
        filterNeedForPickup,
        filterNeedForDrop,
        filterNeedForAccommodation,
        searchQuery,
        filterModeOfTravel,
        filterModeOfTravelForDrop,
        filterCheckInDate,
        filterCheckOutDate,
    ]);

    // State for entry statuses, mapped by unique student ID
    const [entryStatuses, setEntryStatuses] = useState({});

    // Load initial state from local storage
    useEffect(() => {
        const storedStatuses = JSON.parse(localStorage.getItem('entryStatuses'));
        if (storedStatuses) {
            setEntryStatuses(storedStatuses);
        }
    }, []);

    // Update local storage when entryStatuses changes
    useEffect(() => {
        localStorage.setItem('entryStatuses', JSON.stringify(entryStatuses));
    }, [entryStatuses]);

    // Toggle status for a specific student
    const handleToggleStatus = (studentId) => {
        setEntryStatuses((prevStatuses) => ({
            ...prevStatuses,
            [studentId]: !prevStatuses[studentId], // Toggle only this student's status
        }));
    };

    return user && filteredData ? (
        <>
            <div className={"flex flex-col justify-center w-screen md:w-fit ml-auto mr-auto"}>
                <div className="rounded-2xl p-4 m-4 bg-white border overflow-x-auto justify-between flex flex-col md:flex-row gap-4 md:gap-0">
                    <div>
                        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
                        <p className="text-gray-700">{user.email}</p>
                    </div>
                    <div className="flex flex-row">
                        <button
                            className="bg-[#fffece] text-[#2c350b] font-bold px-4 py-1 rounded-xl mr-2"
                            onClick={() => router.push('/admin/event')}
                        >
                            Events
                        </button>
                        <button
                            className="bg-[#fffece] text-[#2c350b] font-bold px-4 py-1 rounded-xl mr-2"
                            onClick={() => router.push('/admin/accommodation')}
                        >
                            Accommodation
                        </button>
                        <button
                            className="bg-[#ffcece] text-[#350b0b] font-bold px-4 py-1 rounded-xl"
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

                <div className="flex flex-row flex-wrap gap-4 m-4 justify-center overflow-x-auto">
                    <div className="bg-white p-4 rounded-2xl border w-full">
                        <div className="flex flex-col gap-4">
                            <div>
                                <input
                                    id="search"
                                    className="border pt-2 pb-2 pl-4 rounded-2xl w-full"
                                    placeholder="Search by name or student ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="flex flex-col flex-grow w-full md:w-auto">
                                    <label htmlFor="district" className="mb-2"><b>District</b></label>
                                    <select
                                        id="district"
                                        className="border p-2 rounded-2xl"
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        {districts.map((district, index) => (
                                            <option key={index} value={district}>{district}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col flex-grow w-full">
                                    <label htmlFor="event" className="mb-2"><b>Event</b></label>
                                    <select
                                        id="event"
                                        className="border p-2 rounded-2xl"
                                        value={filterEvent}
                                        onChange={(e) => setFilterEvent(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        {events.map((event, index) => (
                                            <option key={index} value={event}>{event}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col flex-grow w-full">
                                    <label htmlFor="group" className="mb-2"><b>Group</b></label>
                                    <select
                                        id="group"
                                        className="border p-2 rounded-2xl"
                                        value={filterGroup}
                                        onChange={(e) => setFilterGroup(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        {groups.map((group, index) => (
                                            <option key={index} value={group}>{group}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row m-4 gap-4 items-center">
                    <div className="bg-white p-4 rounded-2xl border flex-grow w-full md:w-auto">
                        <div className="flex flex-row flex-wrap justify-between gap-2">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="needForPickup"><b>Needs Pickup</b></label>
                                <select
                                    id="needForPickup"
                                    className="border p-2 rounded-2xl"
                                    value={filterNeedForPickup}
                                    onChange={(e) => setFilterNeedForPickup(e.target.value)}
                                >
                                    <option value="" >All</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="modeOfTravel"><b>Mode Of Travel</b></label>
                                <select
                                    id="modeOfTravel"
                                    className="border p-2 rounded-2xl"
                                    value={filterModeOfTravel}
                                    onChange={(e) => setFilterModeOfTravel(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {modeOfTravelOptions.map((mode, index) => (
                                        <option key={index} value={mode}>{mode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border flex-grow w-full md:w-auto">
                        <div className="flex flex-row flex-wrap justify-between gap-2">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="needForDrop"><b>Needs Drop</b></label>
                                <select
                                    id="needForDrop"
                                    className="border p-2 rounded-2xl"
                                    value={filterNeedForDrop}
                                    onChange={(e) => setFilterNeedForDrop(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div className="flex flex-col justify-between gap-2 w-full md:w-auto">
                                <label htmlFor="modeOfTravelForDrop"><b>Mode Of Travel</b></label>
                                <select
                                    id="modeOfTravelForDrop"
                                    className="border p-2 rounded-2xl"
                                    value={filterModeOfTravelForDrop}
                                    onChange={(e) => setFilterModeOfTravelForDrop(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {modeOfTravelForDropOptions.map((mode, index) => (
                                        <option key={index} value={mode}>{mode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border flex-grow w-full md:w-auto">
                        <div className="flex flex-col md:flex-row flex-wrap justify-between gap-2">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="needForAccommodation"><b>Needs Accommodation</b></label>
                                <select
                                    id="needForAccommodation"
                                    className="border p-2 rounded-2xl"
                                    value={filterNeedForAccommodation}
                                    onChange={(e) => setFilterNeedForAccommodation(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="pickupPoint"><b>Check In Date</b></label>
                                <select
                                    id="checkInDate"
                                    className="border p-2 rounded-2xl"
                                    value={filterCheckInDate}
                                    onChange={(e) => setFilterCheckInDate(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {checkInDateOptions.map((date, index) => (
                                        <option key={index} value={date}>{date}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label htmlFor="dropOffPoint"><b>Check Out Date</b></label>
                                <select
                                    id="checkOutDate"
                                    className="border p-2 rounded-2xl"
                                    value={filterCheckOutDate}
                                    onChange={(e) => setFilterCheckOutDate(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {checkOutDateOptions.map((date, index) => (
                                        <option key={index} value={date}>{date}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="flex flex-col md:flex-row flex-wrap gap-4 m-4 justify-center overflow-x-auto">
                    <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <div>
                            <p className="text-lg font-bold">Total Registrations</p>
                            <p className="text-sm font-semibold text-gray-500">Participants</p>
                        </div>
                        <div className="flex justify-around gap-3">
                            <div className="pt-2">
                                <p className="text-sm font-bold">Male</p>
                                <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0), 0)}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-sm font-bold">Female</p>
                                <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.gender == "Female" ? 1 : 0) ?? 0), 0)}</p>
                            </div>
                            <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                                <p className="text-sm font-bold">Total</p>
                                <p className="text-4xl font-bold">
                                    {filteredData.reduce((acc, row) => acc + parseInt((row.gender == "Male" ? 1 : 0) ?? 0), 0) + filteredData.reduce((acc, row) => acc + parseInt((row.gender == "Female" ? 1 : 0) ?? 0), 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <div>
                            <p className="text-lg font-bold">Total Accompanying Adults</p>
                            <p className="text-sm font-semibold text-gray-500">Non-Participants</p>
                        </div>
                        <div className="flex justify-around gap-3">
                            <div className="pt-2">
                                <p className="text-sm font-bold">Male</p>
                                <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanying ?? 0), 0)}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-sm font-bold">Female</p>
                                <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanying ?? 0), 0)}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-sm font-bold">Children</p>
                                <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt(row.numNonParticipatingSiblings ?? 0), 0)}</p>
                            </div>
                            <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                                <p className="text-sm font-bold">Total</p>
                                <p className="text-4xl font-bold">
                                    {filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanying ?? 0), 0) +
                                        filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanying ?? 0), 0) +
                                        filteredData.reduce((acc, row) => acc + parseInt(row.numNonParticipatingSiblings ?? 0), 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border flex flex-col justify-between">
                        <p className="text-lg font-bold">Accommodation Logistics</p>
                        <div className="flex flex-row flex-nowrap">
                            <div className="pr-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500">Non-Participants</p>
                                </div>
                                <div className="flex justify-around gap-3">
                                    <div className="pt-2">
                                        <p className="text-sm font-bold">Male</p>
                                        <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanyingNeedAccommodation ?? 0), 0)}</p>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-sm font-bold">Female</p>
                                        <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanyingNeedAccommodation ?? 0), 0)}</p>
                                    </div>
                                    {/* <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                                        <p className="text-sm font-bold">Total</p>
                                        <p className="text-4xl font-bold">
                                            {filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanyingNeedAccommodation ?? 0), 0) +
                                                filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanyingNeedAccommodation ?? 0), 0)}
                                        </p>
                                    </div> */}
                                </div>
                            </div>
                            <div className="border-l px-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-500">Participants</p>
                                </div>
                                <div className="flex justify-around gap-3">
                                    <div className="pt-2">
                                        <p className="text-sm font-bold">Male</p>
                                        <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Male" ? 1 : 0) ?? 0), 0)}</p>
                                    </div>
                                    <div className="pt-2">
                                        <p className="text-sm font-bold">Female</p>
                                        <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Female" ? 1 : 0) ?? 0), 0)}</p>
                                    </div>
                                    {/* <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                                        <p className="text-sm font-bold">Total</p>
                                        <p className="text-4xl font-bold">
                                            {filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Male" ? 1 : 0) ?? 0), 0) +
                                                filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Female" ? 1 : 0) ?? 0), 0)}
                                        </p>
                                    </div> */}
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
                                    <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Male" ? 1 : 0) ?? 0), 0) + filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanyingNeedAccommodation ?? 0), 0)}</p>
                                </div>
                                <div className="pt-2">
                                    <p className="text-sm font-bold">Female</p>
                                    <p className="text-4xl font-bold">{filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Female" ? 1 : 0) ?? 0), 0) +
                                        filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanyingNeedAccommodation ?? 0), 0)}</p>
                                </div>
                                <div className="pt-2 bg-gray-100 p-2 px-8 rounded-2xl">
                                    <p className="text-sm font-bold">Total</p>
                                    <p className="text-4xl font-bold">
                                        {filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Male" ? 1 : 0) ?? 0), 0) +
                                            filteredData.reduce((acc, row) => acc + parseInt((row.needsAccommodation == "Yes" && row.gender == "Female" ? 1 : 0) ?? 0), 0) + filteredData.reduce((acc, row) => acc + parseInt(row.numMaleAccompanyingNeedAccommodation ?? 0), 0) +
                                            filteredData.reduce((acc, row) => acc + parseInt(row.numFemaleAccompanyingNeedAccommodation ?? 0), 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile View */}
                <div className="bg-white p-2 rounded-3xl border flex flex-col justify-between m-4 md:hidden gap-4">
                    {filteredData.map((row, index) => (
                        <div key={index} className={`${row.overallRegistrationStatus === "Accepted" ? "bg-gray-100" : "bg-red-200"} text-bold flex flex-col gap-2 rounded-2xl`}>
                            <div className="px-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <p className="mt-1 text-xs font-semibold text-gray-600">Student Details</p>
                                    <td className="px-4 py-2">
                                        {entryStatuses[row.studentId] ? (
                                            <button
                                                className="bg-[#f99] text-xs text-[#950606] font-bold px-3 py-1 rounded-3xl flex items-center"
                                                onClick={() => handleToggleStatus(row.studentId)}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="w-4 h-4 mr-2"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                                Delete Entry
                                            </button>
                                        ) : (
                                            <button
                                                className="bg-[#a8d9f7] text-xs text-[#084469] font-bold px-3 py-1 rounded-3xl"
                                                onClick={() => handleToggleStatus(row.studentId)}
                                            >
                                                Mark Entry
                                            </button>
                                        )}
                                    </td>
                                </div>
                                <p className="font-bold">{row.studentFullName ?? "-"}</p>
                                <p className="text-xs">{row.gender ?? "-"} - {row.dateOfBirth ?? "-"}</p>
                                <p className="text-xs">{row.district ?? "-"}, {row.samithiName ?? '-'}</p>
                                <p className="text-xs mt-2">DOJ BV: {row.dateOfJoiningBalvikas ?? '-'} {row.yearOfJoiningBalvikas ?? '-'}</p>
                                {row.studentGroup === 'Group 3' && (
                                    <p className="text-xs">Passed group 2: {row.hasPassedGroup2Exam ?? '-'}</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-1 px-3">
                                <p className="text-xs font-bold bg-[#c4ffc2] text-[#07210d] p-1 px-2 rounded-2xl w-fit">{row.studentId ?? "-"}</p>
                                <p className="text-xs font-bold bg-[#bad1ff] text-[#090e2d] p-1 px-2 rounded-2xl w-fit">{row.studentGroup ?? "-"}</p>
                                {row.registeredEvents.map((event, index) => (
                                    <p key={index} className="text-xs bg-green-200 text-green-800 font-bold rounded-xl p-1 px-2 w-fit">{event ?? "-"}</p>
                                ))}
                            </div>
                            <hr className="border-t mx-4 mt-3" />
                            <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-600 px-4">Arrival & Departure Logistics</p>
                                <div className="flex flex-col gap-1 px-3">
                                    <div className="border bg-gray-200 rounded-2xl p-2 w-full mt-1">
                                        <p className="text-xs font-semibold">{"Arrival"}</p>
                                        <p className="text-xs font-bold">{row.arrivalDate ?? "-"} - {row.arrivalTime ?? "-"}</p>
                                        <p className="text-xs">{row.needsPickup === "Yes" ? "Needs pickup." : "Pickup not needed."}</p>
                                        {row.needsPickup === "Yes" && (
                                            <div className="bg-blue-100 p-2 rounded-xl mt-2 border border-blue-300">
                                                <p className="text-xs text-blue-950 font-semibold">Mode: {row.modeOfTravel ?? "-"}</p>
                                                <p className="text-xs text-blue-950 font-semibold">Pickup Point: {row.pickupPoint ?? "-"}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="border bg-gray-200 rounded-2xl p-2 w-full">
                                        <p className="text-xs font-semibold">{"Departure"}</p>
                                        <p className="text-xs font-bold">{row.departureDate ?? "-"} - {row.departureTime ?? "-"}</p>
                                        <p className="text-xs">{row.needsDrop === "Yes" ? "Needs drop." : "Drop not needed."}</p>
                                        {row.needsDrop === "Yes" && (
                                            <div className="bg-blue-100 p-2 rounded-xl mt-2 border border-blue-300">
                                                <p className="text-xs text-blue-950 font-semibold">Mode: {row.modeOfTravelForDrop ?? "-"}</p>
                                                <p className="text-xs text-blue-950 font-semibold">Drop Point: {row.dropOffPoint ?? "-"}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <hr className="border-t mx-4 my-" />
                            <div className="py-2">
                                <p className="px-4 text-xs font-semibold text-gray-600">Accompany Details</p>
                                <p className="px-4 text-xs">{row.hasAccompanyingAdults === "Yes" ? "Has Accompanying adults." : "No Accompany."}</p>
                                <div className="mt-2 mx-3 bg-gray-50 p-2 rounded-2xl">
                                    <p className="text-xs font-bold">{row.accompanyingPersonName ?? "-"}</p>
                                    <p className="text-xs">{row.accompanyingPersonGender ?? "-"} - {row.accompanyingPersonAge ?? "-"} yrs</p>
                                    <p className="text-xs">{row.accompanyingPersonRelation ?? "-"}</p>
                                    <p className="text-xs">{row.accompanyingPersonContact ?? "-"}</p>
                                    <div className="flex gap-1 mt-2">
                                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numMaleAccompanying ?? "0"} male</p>
                                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numFemaleAccompanying ?? "0"} female</p>
                                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numNonParticipatingSiblings ?? "0"} children</p>
                                    </div>
                                </div>
                            </div>
                            <hr className="border-t mx-4" />
                            <div className="pt-2">
                                <p className="px-4 text-xs font-semibold text-gray-600">Accommodation Details</p>
                                <div className="mt-2 mx-3 bg-gray-50 p-2 rounded-2xl">
                                    <p className="text-xs font-bold">Check-In</p>
                                    <p className="text-xs">{row.checkInDate ?? "-"} - {row.checkInTime ?? "-"}</p>
                                    <p className="text-xs font-bold">Check-Out</p>
                                    <p className="text-xs">{row.checkOutDate ?? "-"} - {row.checkOutTime ?? "-"}</p>

                                    <p className="text-xs mt-2 font-semibold">For student: {row.needsAccommodation ?? "-"}</p>
                                    <p className="text-xs">Allergies: {row.foodAllergies ?? "-"}</p>
                                    <div className="flex gap-1 flex-wrap mt-2">
                                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numMaleAccompanyingNeedAccommodation ?? "0"} male</p>
                                        <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numFemaleAccompanyingNeedAccommodation ?? "0"} female</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tab and Desktop View */}
                <div className="overflow-x-auto m-4 hidden md:block">
                    <table className="table-auto w-full mt-6 border-collapse">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="px-4 py-2 border">Student Details</th>
                                <th className="px-4 py-2 border">BalVikas Details</th>
                                <th className="px-4 py-2 border">Arrival & Departure Logistics</th>
                                <th className="px-4 py-2 border">Accompany Details</th>
                                <th className="px-4 py-2 border">Accommodation Details</th>
                                <th className="px-4 py-2 border">Entry Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, index) => (
                                <tr key={index} className={`${row.overallRegistrationStatus === "Accepted" ? "bg-white" : "bg-red-200"} hover:bg-blue-50 text-bold transition duration-200`}>
                                    <td className="px-4 py-2 border max-w-[160px]">
                                        <p className="font-bold">{row.studentFullName ?? "-"}</p>
                                        <p className="text-xs">{row.gender ?? "-"} - {row.dateOfBirth ?? "-"}</p>
                                        <div className="flex flex-wrap gap-1 mt-3 mb-2">
                                            <p className="text-xs font-bold bg-[#c4ffc2] text-[#07210d] p-1 px-2 rounded-2xl w-fit">{row.studentId ?? "-"}</p>
                                            <p className="text-xs font-bold bg-[#bad1ff] text-[#090e2d] p-1 px-2 rounded-2xl w-fit">{row.studentGroup ?? "-"}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border max-w-[200px]">
                                        <p className="font-bold">{row.district ?? "-"}</p>
                                        <p className="text-xs">{row.samithiName ?? '-'}</p>
                                        <p className="text-xs">DOJ BV: {row.dateOfJoiningBalvikas ?? '-'} {row.yearOfJoiningBalvikas ?? '-'}</p>
                                        {row.studentGroup === 'Group 3' && (
                                            <p className="text-xs">Passed group 2: {row.hasPassedGroup2Exam ?? '-'}</p>
                                        )}
                                        <div className="flex flex-wrap mt-2 gap-1">
                                            {row.registeredEvents.map((event, index) => (
                                                <p key={index} className="text-xs bg-green-200 text-green-800 font-bold rounded-xl p-1 px-2 w-fit">{event ?? "-"}</p>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="border max-w-[200px]">
                                        <div className="flex flex-col justify-around items-center gap-4 mt-2 mb-2">
                                            <div className="border rounded-2xl p-2 w-60">
                                                <p className="text-xs font-semibold">{"Arrival"}</p>
                                                <p className="text-xs font-bold">{row.arrivalDate ?? "-"} - {row.arrivalTime ?? "-"}</p>
                                                <p className="text-xs">{row.needsPickup === "Yes" ? "Needs pickup." : "Pickup not needed."}</p>
                                                {row.needsPickup === "Yes" && (
                                                    <div className="bg-purple-100 p-2 rounded-xl mt-2">
                                                        <p className="text-xs">Mode: {row.modeOfTravel ?? "-"}</p>
                                                        <p className="text-xs">Pickup Point: {row.pickupPoint ?? "-"}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="border rounded-2xl p-2 w-60">
                                                <p className="text-xs font-semibold">{"Departure"}</p>
                                                <p className="text-xs font-bold">{row.departureDate ?? "-"} - {row.departureTime ?? "-"}</p>
                                                <p className="text-xs">{row.needsDrop === "Yes" ? "Needs drop." : "Drop not needed."}</p>
                                                {row.needsDrop === "Yes" && (
                                                    <div className="bg-purple-100 p-2 rounded-xl mt-2">
                                                        <p className="text-xs">Mode: {row.modeOfTravelForDrop ?? "-"}</p>
                                                        <p className="text-xs">Drop Point: {row.dropOffPoint ?? "-"}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border">
                                        <p className="text-xs">{row.hasAccompanyingAdults === "Yes" ? "Has Accompanying adults." : "No Accompany."}</p>
                                        <div className="mt-2 bg-purple-100 p-2 rounded-2xl">
                                            <p className="text-xs font-bold">{row.accompanyingPersonName ?? "-"}</p>
                                            <p className="text-xs">{row.accompanyingPersonGender ?? "-"} - {row.accompanyingPersonAge ?? "-"} yrs</p>
                                            <p className="text-xs">{row.accompanyingPersonRelation ?? "-"}</p>
                                            <p className="text-xs">{row.accompanyingPersonContact ?? "-"}</p>
                                            <div className="flex gap-1 mt-2">
                                                <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numMaleAccompanying ?? "0"} male</p>
                                                <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numFemaleAccompanying ?? "0"} female</p>
                                                <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numNonParticipatingSiblings ?? "0"} children</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border">
                                        <div className="mt-2 bg-purple-100 p-2 rounded-2xl">
                                            <p className="text-xs font-bold">Check-In</p>
                                            <p className="text-xs">{row.checkInDate ?? "-"} - {row.checkInTime ?? "-"}</p>
                                            <p className="text-xs font-bold">Check-Out</p>
                                            <p className="text-xs">{row.checkOutDate ?? "-"} - {row.checkOutTime ?? "-"}</p>

                                            <p className="text-xs mt-2 font-semibold">For student: {row.needsAccommodation ?? "-"}</p>
                                            <p className="text-xs">Allergies: {row.foodAllergies ?? "-"}</p>
                                            <div className="flex gap-1 flex-wrap mt-2">
                                                <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numMaleAccompanyingNeedAccommodation ?? "0"} male</p>
                                                <p className="text-xs bg-blue-200 text-blue-800 font-bold rounded-xl p-1 px-2 w-fit">{row.numFemaleAccompanyingNeedAccommodation ?? "0"} female</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 border">
                                        {entryStatuses[row.studentId] ? (
                                            <button
                                                className="bg-[#f99] text-white text-[#950606] font-bold px-4 py-2 rounded-3xl flex items-center"
                                                onClick={() => handleToggleStatus(row.studentId)}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={1.5}
                                                    stroke="currentColor"
                                                    className="w-5 h-5 mr-2"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                                Delete Entry
                                            </button>
                                        ) : (
                                            <button
                                                className="bg-[#a8d9f7] text-white text-[#084469] font-bold px-4 py-2 rounded-3xl"
                                                onClick={() => handleToggleStatus(row.studentId)}
                                            >
                                                Mark Entry
                                            </button>
                                        )}
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
            <p className="text-2xl font-semibold">Loading...</p>
        </div>
    )
}