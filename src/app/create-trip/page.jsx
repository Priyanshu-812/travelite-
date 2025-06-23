"use client";
/* eslint-disable no-unused-vars */

import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  AI_PROMPT,
  SelectBudgetOptions,
  SelectTravelList,
} from "@/constants/Options";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { chatSession } from "@/service/AIModel";
import { useUser } from "@clerk/nextjs";
import { setDoc, doc } from "firebase/firestore";
import { db } from "@/service/firebaseConfig";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Overlay from "@/components/Overlay";

const CreateTrip = () => {
  const [currentInput, setCurrentInput] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(""); // State to hold the final selected destination

  // State for form inputs
  const [inputDays, setInputDays] = useState("");
  const [inputBudget, setInputBudget] = useState("");
  const [inputPeople, setInputPeople] = useState("");

  const { isLoaded, user } = useUser(); // Access user information
  console.log(user);

  const router = useRouter();

  // loading state for management
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    destination: "",
    days: "",
    budget: "",
    people: "",
  });

  //   generating prompt
  const generateTripPlan = async (destination, days, budget, people) => {
    setLoading(true);

    // final prompt
    const FINAL_PROMPT = AI_PROMPT.replace("{location}", destination)
      .replace("{totaldays}", days)
      .replace("{traveller}", people)
      .replace("{budget}", budget)
      .replace("{totaldays}", days);

    // console.log("Final Prompt:", FINAL_PROMPT);

    if (!user) {
      toast.error("Please Sign in First");
    }
    // passing final prompt to gemini model
    const result = await chatSession.sendMessage(FINAL_PROMPT);
    // console.log(result?.response?.text());
    setLoading(false);
    SaveAiTrip(result?.response?.text(), destination, days, budget, people);
  };

  // saving trip to database
  const SaveAiTrip = async (TripData, destination, days, budget, people) => {
    setLoading(true);
    const docId = Date.now().toString();
    const userEmail = user.primaryEmailAddress.emailAddress;
    await setDoc(doc(db, "AITrips", docId), {
      userSelection: { destination, days, budget, people },
      tripData: JSON.parse(TripData),
      userEmail: userEmail,
      id: docId,
    });
    setLoading(false);
    // console.log("Trip Data:", TripData);
    //navigate(`/view-trip/${docId}`)
    router.push(`/view-trip/${docId}`);
  };

  // setting form values in handle submit and calling genrate trip function
  const handleSubmit = () => {
    if (!selectedDestination || !inputDays || !inputBudget || !inputPeople) {
      toast.error("Please fill in all the fields");
      return;
    }
    if (inputDays < 1 || inputDays > 10) {
      toast.error("Please enter a valid number of days (1-10)");
      return;
    }
    setFormData({
      destination: selectedDestination,
      days: inputDays,
      budget: inputBudget,
      people: inputPeople,
    });

    generateTripPlan(selectedDestination, inputDays, inputBudget, inputPeople);
  };

  // for printing value of formdata
  // useEffect(() => {
  //   if (
  //     formData.destination ||
  //     formData.days ||
  //     formData.budget ||
  //     formData.people
  //   ) {
  //     console.log("Form Data:", formData);
  //   }
  // }, [formData]);

  useEffect(() => {
    if (currentInput.length > 0) {
      const getDatas = async () => {
        const options = {
          method: "GET",
          url: "https://google-place-autocomplete-and-place-info.p.rapidapi.com/maps/api/place/autocomplete/json",
          params: { input: currentInput },
          headers: {
            "x-rapidapi-key":
              "fbbb80289cmsh1c86d4e02268e44p161fdfjsn3dbdf624ba97",
            "x-rapidapi-host":
              "google-place-autocomplete-and-place-info.p.rapidapi.com",
          },
        };
        try {
          const response = await axios.request(options);
          setPredictions(response.data.predictions);
          //console.log(response.data.predictions);
          setIsDropdownOpen(true); // Open the dropdown
        } catch (error) {
          console.error(error);
        }
      };
      getDatas();
    } else {
      setPredictions([]);
      setIsDropdownOpen(false); // Close the dropdown
    }
  }, [currentInput]);

  const handleSelectPrediction = (description) => {
    setCurrentInput(description);
    setSelectedDestination(description); // Update the selected destination state
    setPredictions([]);
    setIsDropdownOpen(false); // Close the dropdown after selection
  };

  const containerVariants = {
    hidden: { opacity: 0, x: -100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 120,
        delay: 0.2,
      },
    },
  };

  return (
    <>
      {loading && <Overlay />} {/* Show the overlay when loading */}
      <motion.div
        className="w-full sm:px-10 md:px-32 lg:px-56 xl:px-72 flex flex-col items-center gap-6 py-12"
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="flex flex-col gap-2 items-center text-center w-full"
          variants={containerVariants}
        >
          <h2 className="font-bold text-3xl">
            Tell us your travel{" "}
            <span className="bg-indigo-400 text-white px-4 py-2 rounded-lg shadow-lg">
              preferences 🏖️
            </span>
          </h2>

          <p className="mt-3 text-gray-500 text-md">
            Provide us with basic information, and our trip planner will
            generate a customized itinerary based on your preferences.
          </p>
        </motion.div>

        <motion.div className="w-[90%]" variants={containerVariants}>
          {/* Form */}
          <motion.div className="" variants={containerVariants}>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl my-3 font-medium">
                What is your destination of choice?
              </h2>
              <Input
                type="text"
                className="w-full"
                placeholder="Enter your destination"
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  if (!isDropdownOpen) {
                    setIsDropdownOpen(true); // Reopen the dropdown if the user starts typing again
                  }
                }}
              />
            </div>

            {isDropdownOpen && predictions.length > 0 && (
              <ul className="border border-gray-300 mt-2 rounded-md shadow-lg max-h-60 overflow-auto">
                {predictions.map((prediction, index) => (
                  <li
                    key={index}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      handleSelectPrediction(prediction.description)
                    }
                  >
                    {prediction.description}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Number of days input */}
          <motion.div
            className="flex flex-col gap-2"
            variants={containerVariants}
          >
            <h2 className="text-xl my-3 font-md mt-8 font-medium">
              How many days are you planning for your trip?
            </h2>
            <Input
              type="number"
              min="1"
              max="10"
              placeholder="Enter number of days"
              className="full"
              value={inputDays}
              onChange={(e) => setInputDays(e.target.value)}
            />
          </motion.div>

          {/* Budget input */}
          <motion.div variants={containerVariants}>
            <h2 className="text-xl my-3 font-md mt-8 font-semibold">
              Choose your budget
            </h2>
            <div className="grid grid-cols-3 gap-5 mt-5 cursor-pointer">
              {SelectBudgetOptions.map((option) => (
                <motion.div
                  key={option.id}
                  className={`p-4 border rounded-lg hover:shadow-2xl ${
                    inputBudget == option.title && "shadow-lg border-[2px] "
                  }`}
                  onClick={() => setInputBudget(option.title)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <h2 className="text-3xl">{option.icon}</h2>
                  <h2 className="font-bold text-lg">{option.title}</h2>
                  <h2 className="text-sm text-gray-800">{option.desc}</h2>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Number of people input */}
          <motion.div variants={containerVariants}>
            <h2 className="text-xl my-3 font-md mt-8 font-semibold">
              How many people are traveling?
            </h2>
            <div className="grid grid-cols-3 gap-5 mt-5 cursor-pointer mb-5">
              {SelectTravelList.map((option) => (
                <motion.div
                  key={option.id}
                  className={`p-4 border rounded-lg hover:shadow-2xl ${
                    inputPeople == option.people && "shadow-lg border-[2px]"
                  }`}
                  onClick={() => setInputPeople(option.people)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <h2 className="text-3xl">{option.icon}</h2>
                  <h2 className="font-bold text-lg">{option.title}</h2>
                  <h2 className="text-sm text-gray-800">{option.desc}</h2>
                  <h2 className="text-sm text-gray-600 font-thin font-serif mt-2 flex justify-start">
                    ({option.people})
                  </h2>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Submit button */}
          <motion.div
            className="mt-10 justify-end flex"
            variants={containerVariants}
          >
            {loading && (
              <Button disabled={true} className="w-full py-4 text-base">
                Generating trip...
              </Button>
            )}
            {!loading && (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full py-4 text-base`}
              >
                Generate trip ✈️
              </Button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default CreateTrip;

// import { useState } from "react";
// import Overlay from "@/components/Overlay"; // Adjust the import path as needed

// const CreateTrip = () => {
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async () => {
//     if (!selectedDestination || !inputDays || !inputBudget || !inputPeople) {
//       toast.error("Please fill in all the fields");
//       return;
//     }
//     if (inputDays < 1 || inputDays > 10) {
//       toast.error("Please enter a valid number of days (1-10)");
//       return;
//     }
//     setFormData({
//       destination: selectedDestination,
//       days: inputDays,
//       budget: inputBudget,
//       people: inputPeople,
//     });

//     setLoading(true); // Show the overlay

//     await generateTripPlan(
//       selectedDestination,
//       inputDays,
//       inputBudget,
//       inputPeople
//     );

//     // The loading state will be turned off in `generateTripPlan` after the navigation
//   };

//   const generateTripPlan = async (destination, days, budget, people) => {
//     // Existing logic to generate the trip plan and save to database
//     const FINAL_PROMPT = AI_PROMPT.replace("{location}", destination)
//       .replace("{totaldays}", days)
//       .replace("{traveller}", people)
//       .replace("{budget}", budget)
//       .replace("{totaldays}", days);

//     if (!user) {
//       toast.error("Please Sign in First");
//     }
//     const result = await chatSession.sendMessage(FINAL_PROMPT);
//     SaveAiTrip(result?.response?.text(), destination, days, budget, people);
//   };

//   const SaveAiTrip = async (TripData, destination, days, budget, people) => {
//     setLoading(true);
//     const docId = Date.now().toString();
//     const userEmail = user.primaryEmailAddress.emailAddress;
//     await setDoc(doc(db, "AITrips", docId), {
//       userSelection: { destination, days, budget, people },
//       tripData: JSON.parse(TripData),
//       userEmail: userEmail,
//       id: docId,
//     });
//     setLoading(false);
//     router.push(`/view-trip/${docId}`);
//   };

//   return (
//         {/* Rest of your component */}
//   );
// };

// export default CreateTrip;
