"use client";
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Poiret_One } from 'next/font/google';
import { ChevronLeft, ArrowRight, ArrowLeft, X, XCircle, CheckCircle} from 'lucide-react';
import { headTextAnimation, slideAnimation } from '../../config/motion';
import PhoneInput from 'react-phone-number-input'
import ClickSpark from '@/components/ClickSpark';
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth, db } from '@/app/firebase/config';
import { setDoc, doc, collection, addDoc } from 'firebase/firestore';
import { bmi, bmr, maintenanceCalories } from '@/app/Utils/MetricCalc';
import { useRouter } from 'next/navigation';

const fontPoiretOne = Poiret_One({
    subsets: ['latin'],
    weight: ['400']
})

interface UserData {
    name: string;
    email: string;
    pass: string;
    phone: string;
    weight: string;
    dob: string;
    height: string;
    gender: string;
    exercise_intensity: string;
    body_type: string;
    any_complication: string;
    goal: string;
    explain_goal: string;
    budget: string;
    diet: string;
    bmi: string;
    bmr: string;
    maintenanceCalories: number;
    ideal_bmi : number | string;
    req_cal_intake: string;
    ideal_bmr: number | string
}

interface PopupMessage {
    message: string;
    type: 'error' | 'success';
}

export default function Page() {
    const [stage, setStage] = useState(0);
    const [popup, setPopup] = useState<PopupMessage | null>(null);
    const router = useRouter();
    const [user, setUser] = useState<UserData>({
        name: '',
        email: '',
        pass: '',
        phone: '',
        weight: '',
        dob: '',
        height: '',
        gender: '',
        exercise_intensity: '',
        body_type: '',
        any_complication: '',
        goal: '',
        explain_goal: '',
        budget: '',
        diet: '',
        bmi: '',
        bmr: '',
        maintenanceCalories: 0,
        ideal_bmi: '',
        ideal_bmr: '',
        req_cal_intake: ''
    });

    const [createUserWithEmailAndPassword] = useCreateUserWithEmailAndPassword(auth);

    const showPopup = (message: string, type: 'error' | 'success' = 'error') => {
        setPopup({ message, type });
    };

    const closePopup = () => {
        setPopup(null);
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 6;
    };

    const validateAge = (dob: string): boolean => {
        const birthDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 13 && age - 1 <= 120;
        }
        return age >= 13 && age <= 120;
    };

    const validateStage0 = (): string | null => {
        if (!user.name.trim()) return 'Please enter your full name';
        if (user.name.trim().length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(user.name.trim())) return 'Name should only contain letters';

        if (!user.email.trim()) return 'Please enter your email';
        if (!validateEmail(user.email)) return 'Please enter a valid email address';

        if (!user.pass) return 'Please enter a password';
        if (!validatePassword(user.pass)) return 'Password must be at least 6 characters';
        if (!/[A-Za-z]/.test(user.pass)) return 'Password must contain at least one letter';
        if (!/[0-9]/.test(user.pass)) return 'Password must contain at least one number';

        if (!user.phone) return 'Please enter your phone number';
        if (!validatePhone(user.phone)) return 'Please enter a valid phone number';

        return null;
    };

    const validateStage1 = (): string | null => {
        if (!user.weight) return 'Please enter your weight';
        const weight = parseFloat(user.weight);
        if (isNaN(weight) || weight < 20 || weight > 300) {
            return 'Please enter a valid weight between 20-300 kg';
        }

        if (!user.height) return 'Please enter your height';
        const height = parseFloat(user.height);
        if (isNaN(height) || height < 50 || height > 250) {
            return 'Please enter a valid height between 50-250 cm';
        }

        if (!user.dob) return 'Please select your date of birth';
        if (!validateAge(user.dob)) {
            return 'You must be between 13 and 120 years old';
        }

        if (!user.gender) return 'Please select your gender';
        if (!user.body_type) return 'Please select your body type';
        if (!user.exercise_intensity) return 'Please select your exercise frequency';

        return null;
    };

    const validateStage2 = (): string | null => {
        if (!user.budget) return 'Please enter your monthly fitness budget';
        const budget = parseFloat(user.budget);
        if (isNaN(budget) || budget < 0) {
            return 'Please enter a valid budget amount';
        }

        if (!user.diet || user.diet.trim().length < 3) {
            return 'Please describe your diet preferences';
        }

        if (!user.goal) return 'Please select your fitness goal';

        if (!user.explain_goal || user.explain_goal.trim().length < 10) {
            return 'Please explain your goal in at least 10 characters';
        }

        return null;
    };

    const validateCurrentStage = (): boolean => {
        let error: string | null = null;

        switch (stage) {
            case 0:
                error = validateStage0();
                break;
            case 1:
                error = validateStage1();
                break;
            case 2:
                error = validateStage2();
                break;
        }

        if (error) {
            showPopup(error, 'error');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        try {
            const age = new Date().getFullYear() - new Date(user.dob).getFullYear();
            user.bmi = bmi(user.weight, user.height).toFixed(2);
            user.bmr = bmr(user.weight, user.height, age).toFixed(2);
            user.maintenanceCalories = maintenanceCalories(parseFloat(user.bmr), user.exercise_intensity);

            console.log('Calculated Metrics:', {
                age: age,
                bmi: user.bmi,
                bmr: user.bmr,
                maintenanceCalories: user.maintenanceCalories,
            });

            const res = await createUserWithEmailAndPassword(user.email, user.pass);
            const currUser = res?.user;

            if (currUser) {
                await setDoc(doc(db, 'users', currUser.uid), {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    dob: user.dob,
                    gender: user.gender,
                    diet: user.diet,
                    currentData: {
                        weight: user.weight,
                        height: user.height,
                        exercise_intensity: user.exercise_intensity,
                        body_type: user.body_type,
                        goal: user.goal,
                        budget: user.budget,
                        bmi: user.bmi,
                        bmr: user.bmr,
                        ideal_bmi: user.ideal_bmi,
                        ideal_bmr: user.ideal_bmr,
                        maintenanceCalories: user.maintenanceCalories,
                        any_complication: user.any_complication,
                        explain_goal: user.explain_goal,
                        req_cal_intake: user.req_cal_intake,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });

                await addDoc(collection(db, "users", currUser.uid, "history"), {
                    weight: user.weight,
                    height: user.height,
                    bmi: user.bmi,
                    exercise_intensity: user.exercise_intensity,
                    body_type: user.body_type,
                    goal: user.goal,
                    budget: user.budget,
                    any_complication: user.any_complication,
                    explain_goal: user.explain_goal,
                    timestamp: new Date().toISOString()
                });
                showPopup('Registration successful!', 'success');
                setTimeout(() => {
                    window.location.href = "/";
                }, 2000);
            }
        } catch (error: any) {
            console.error(error);
            const errorMessage = error?.message || 'Registration failed';
            if (errorMessage.includes('EMAIL_EXISTS')) {
                showPopup('This email is already registered. Please use another email or login.', 'error');
            } else {
                showPopup(`Registration failed: ${errorMessage}`, 'error');
            }
        }
    };

    const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (!validateCurrentStage()) return;

        if (stage < 2) {
            setStage(prev => prev + 1);
        } else {
            handleRegister();
        }
    };

    const handleBack = () => {
        if (stage > 0) {
            setStage(prev => prev - 1);
        }
    };

    const renderProgressBars = () => {
        return (
            <div className='flex gap-2 mt-5'>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`w-5 h-1 rounded-full ${stage === i ? 'bg-stone-50' : 'bg-gray-500'
                            }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <ClickSpark
            sparkColor='#fff'
            sparkSize={10}
            sparkRadius={15}
            sparkCount={8}
            duration={400}
        >
<AnimatePresence>
        <div>
          <ChevronLeft
            className="absolute top-10 left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer"
            onClick={() => router.push("/")}
          />
        </div>
      </AnimatePresence>

      {/* Popup Notification */}
      <AnimatePresence>
        {popup && (
          <motion.div
            key="popup"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 ${
              popup.type === "error" ? "bg-red-500" : "bg-green-500"
            } text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50`}
          >
            {popup.type === "error" ? <XCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm">{popup.message}</p>
            <button
              onClick={() => setPopup(null)}
              className="ml-3 text-white hover:text-gray-200 transition"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
            <AnimatePresence>
                <div>
                    <ChevronLeft
                        className='absolute top-10 left-10 text-stone-50 hover:text-gray-500 hover:scale-[1.5] transition cursor-pointer'
                        onClick={() => (window.location.href = "/")}
                    />
                </div>
            </AnimatePresence>
            <div className='w-full h-screen flex justify-center items-center text-stone-50'>
                <div>
                    <motion.h1 {...headTextAnimation} className={`${fontPoiretOne.className} font-bold text-5xl`}>
                        Register
                    </motion.h1>
                    {renderProgressBars()}

                    {stage === 0 && (
                        <motion.form {...slideAnimation('up')} className={`flex flex-col gap-4 mt-10 ${fontPoiretOne.className}`}>
                            <input
                                type="text"
                                name="name"
                                placeholder='Full Name'
                                value={user.name}
                                onChange={(e) => setUser({ ...user, name: e.target.value })}
                                className='border-1 rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                                autoFocus
                            />
                            <input
                                type="email"
                                name="email"
                                placeholder='Email'
                                value={user.email}
                                onChange={(e) => setUser({ ...user, email: e.target.value })}
                                className='border-1 rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                            />
                            <input
                                type="password"
                                name="pass"
                                placeholder='Password (min 6 chars, include letter & number)'
                                value={user.pass}
                                onChange={(e) => setUser({ ...user, pass: e.target.value })}
                                className='border-1 rounded-md border-stone-50 px-3 py-1 outline-none'
                            />
                            <div className="relative">
                                <PhoneInput
                                    placeholder="Enter phone number"
                                    value={user.phone}
                                    onChange={(phone) => setUser({ ...user, phone: phone || '' })}
                                    defaultCountry='IN'
                                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                                    numberInputProps={{
                                        className: 'flex-1 outline-none bg-transparent text-sm'
                                    }}
                                    countrySelectProps={{
                                        className: 'border-none bg-transparent cursor-pointer outline-none text-sm w-16'
                                    }}
                                />
                            </div>
                        </motion.form>
                    )}

                    {stage === 1 && (
                        <motion.form {...slideAnimation('up')} className={`flex flex-col w-[20%] gap-4 mt-10 ${fontPoiretOne.className}`}>
                            <div className='flex flex-col md:flex-row gap-5'>
                                <input
                                    type="number"
                                    name="weight"
                                    placeholder='Current weight in kgs'
                                    value={user.weight}
                                    onChange={(e) => setUser({ ...user, weight: e.target.value })}
                                    className='border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                                    autoFocus
                                    min="20"
                                    max="300"
                                />
                                <input
                                    type="number"
                                    name="height"
                                    placeholder='Height in cms'
                                    value={user.height}
                                    onChange={(e) => setUser({ ...user, height: e.target.value })}
                                    className='border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                                    min="50"
                                    max="250"
                                />
                            </div>
                            <div className='flex flex-col md:flex-row gap-5'>
                                <input
                                    type="date"
                                    name="dob"
                                    placeholder='Date of birth'
                                    value={user.dob}
                                    onChange={(e) => setUser({ ...user, dob: e.target.value })}
                                    className='text-stone-50 w-[100%] border-1 rounded-md border-stone-50 px-3 py-1 outline-none'
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <select
                                    name="gender"
                                    className="border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm bg-transparent"
                                    value={user.gender}
                                    onChange={(e) => setUser({ ...user, gender: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300" disabled>
                                        Select gender
                                    </option>
                                    <option value="male" className="bg-gray-900 text-gray-300">Male</option>
                                    <option value="female" className="bg-gray-900 text-gray-300">Female</option>
                                    <option value="other" className="bg-gray-900 text-gray-300">Other</option>
                                    <option value="prefer_not_to_say" className="bg-gray-900 text-gray-300">Prefer not to say</option>
                                </select>
                            </div>
                            <div className='flex flex-col md:flex-row gap-5'>
                                <select
                                    name="body_type"
                                    className="border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm bg-transparent"
                                    value={user.body_type}
                                    onChange={(e) => setUser({ ...user, body_type: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300" disabled>
                                        Your Body Type
                                    </option>
                                    <option value="ectomorph" className="bg-gray-900 text-gray-300">Ectomorph – Naturally thin, finds it hard to gain weight or muscle</option>
                                    <option value="mesomorph" className="bg-gray-900 text-gray-300">Mesomorph – Naturally fit and muscular, gains muscle easily</option>
                                    <option value="endomorph" className="bg-gray-900 text-gray-300">Endomorph – Broader body, gains fat easily and loses it slowly</option>
                                    <option value="mixed" className="bg-gray-900 text-gray-300">Mixed Type – A mix of two body types (e.g., slim but gains fat easily)</option>
                                </select>
                                <select
                                    name="exercise_intensity"
                                    className="border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm bg-transparent"
                                    value={user.exercise_intensity}
                                    onChange={(e) => setUser({ ...user, exercise_intensity: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300" disabled>
                                        How often do you exercise?
                                    </option>
                                    <option value="no" className="bg-gray-900 text-gray-300">No Exercise</option>
                                    <option value="light" className="bg-gray-900 text-gray-300">Light Exercise/walking or jogging only (1-2 times a week)</option>
                                    <option value="medium" className="bg-gray-900 text-gray-300">Medium Exercise (3-4 times a week)</option>
                                    <option value="regular" className="bg-gray-900 text-gray-300">Daily workout (5-6 times a week)</option>
                                    <option value="student" className="bg-gray-900 text-gray-300">Student workout (Regular workouts. Pause during exams for around 1-2 months)</option>
                                </select>
                            </div>
                            <div>
                                <textarea
                                    name="complications"
                                    id="complications"
                                    value={user.any_complication}
                                    onChange={(e) => setUser({ ...user, any_complication: e.target.value })}
                                    placeholder='Any complications like allergies, disability etc? If not then leave empty'
                                    cols={100}
                                    rows={6}
                                    className='border-2 border-stone-50 p-2 rounded-xl resize-none'
                                />
                            </div>
                        </motion.form>
                    )}

                    {stage === 2 && (
                        <motion.form {...slideAnimation('up')} className={`flex flex-col w-[20%] gap-4 mt-10 ${fontPoiretOne.className}`}>
                            <div className='flex flex-col md:flex-row gap-5'>
                                <input
                                    type="number"
                                    name="budget"
                                    placeholder='(INR) How much can you spend monthly on fitness?'
                                    value={user.budget}
                                    onChange={(e) => setUser({ ...user, budget: e.target.value })}
                                    className='border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                                    autoFocus
                                    min="0"
                                />
                                <input
                                    type="text"
                                    name="diet"
                                    placeholder='Tell about your diet. (E.g., veg, non-veg, veg with eggs, vegan etc.)'
                                    value={user.diet}
                                    onChange={(e) => setUser({ ...user, diet: e.target.value })}
                                    className='border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm'
                                />
                            </div>
                            <div className='flex flex-col md:flex-row gap-5'>
                                <select
                                    name="goal"
                                    className="border-1 w-[50%] rounded-md border-stone-50 px-3 py-1 outline-none min-w-sm bg-transparent"
                                    value={user.goal}
                                    onChange={(e) => setUser({ ...user, goal: e.target.value })}
                                >
                                    <option value="" className="bg-gray-900 text-gray-300" disabled>
                                        Your fitness goal
                                    </option>
                                    <option value="lose_weight" className="bg-gray-900 text-gray-300">Lose Weight – Burn fat and slim down</option>
                                    <option value="build_muscle" className="bg-gray-900 text-gray-300">Build Muscle – Gain strength and muscle mass</option>
                                    <option value="increase_endurance" className="bg-gray-900 text-gray-300">Increase Endurance – Improve stamina and cardio performance</option>
                                    <option value="improve_flexibilty" className="bg-gray-900 text-gray-300">Improve Flexibility – Increase mobility and reduce stiffness</option>
                                    <option value="tone_body" className="bg-gray-900 text-gray-300">Tone Body – Lean muscles, firm shape without big bulk</option>
                                    <option value="overall_fitness" className="bg-gray-900 text-gray-300">Improve Overall Fitness – General health and wellness</option>
                                    <option value="recover" className="bg-gray-900 text-gray-300">Rehabilitation / Recover – Recover from injury or improve mobility</option>
                                </select>
                            </div>
                            <div>
                                <textarea
                                    name="explain_goal"
                                    id="explain_goal"
                                    placeholder='Explain your goal. What exactly do you want to achieve?'
                                    value={user.explain_goal}
                                    onChange={(e) => setUser({ ...user, explain_goal: e.target.value })}
                                    cols={100}
                                    rows={6}
                                    className='border-2 border-stone-50 p-2 rounded-xl resize-none'
                                />
                            </div>
                        </motion.form>
                    )}

                    <div className='flex gap-5'>
                        {stage >= 1 && (
                            <button
                                type="button"
                                className="outline-none relative mt-10 cursor-pointer py-4 px-8 text-center font-barlow inline-flex justify-center text-base uppercase text-white rounded-lg border-solid transition-transform duration-300 ease-in-out group outline-offset-4 focus:outline focus:outline-2 focus:outline-white focus:outline-offset-4 overflow-hidden"
                                onClick={handleBack}
                            >
                                <span className="relative z-20 flex gap-5"><ArrowLeft strokeWidth={1} />Back</span>
                                <span className="absolute left-[-75%] top-0 h-full w-[50%] bg-white/20 rotate-12 z-10 blur-lg group-hover:left-[125%] transition-all duration-1000 ease-in-out"></span>
                                <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-tl-lg border-l-2 border-t-2 top-0 left-0"></span>
                                <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute group-hover:h-[90%] h-[60%] rounded-tr-lg border-r-2 border-t-2 top-0 right-0"></span>
                                <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[60%] group-hover:h-[90%] rounded-bl-lg border-l-2 border-b-2 left-0 bottom-0"></span>
                                <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-br-lg border-r-2 border-b-2 right-0 bottom-0"></span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="relative mt-10 cursor-pointer py-4 px-8 text-center font-barlow inline-flex justify-center text-base uppercase text-white rounded-lg border-solid transition-transform duration-300 ease-in-out group outline-offset-4 focus:outline focus:outline-2 focus:outline-white focus:outline-offset-4 overflow-hidden"
                            onClick={handleNext}
                        >
                            <span className="relative z-20">
                                {stage < 2 ? (
                                    <span className='flex gap-5'>Next <ArrowRight strokeWidth={1} /></span>
                                ) : "Register"}
                            </span>
                            <span className="absolute left-[-75%] top-0 h-full w-[50%] bg-white/20 rotate-12 z-10 blur-lg group-hover:left-[125%] transition-all duration-1000 ease-in-out"></span>
                            <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-tl-lg border-l-2 border-t-2 top-0 left-0"></span>
                            <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute group-hover:h-[90%] h-[60%] rounded-tr-lg border-r-2 border-t-2 top-0 right-0"></span>
                            <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[60%] group-hover:h-[90%] rounded-bl-lg border-l-2 border-b-2 left-0 bottom-0"></span>
                            <span className="w-1/2 drop-shadow-3xl transition-all duration-300 block border-[#D4EDF9] absolute h-[20%] rounded-br-lg border-r-2 border-b-2 right-0 bottom-0"></span>
                        </button>
                    </div>
                    <p className={`${fontPoiretOne.className} mt-5`}>
                        Already have an account? <span className='underline underline-offset-5 cursor-pointer' onClick={() => (window.location.href = "/login")}>Login now</span>
                    </p>
                </div>
            </div>
        </ClickSpark>
    )
}