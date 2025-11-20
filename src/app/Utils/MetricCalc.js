import axios from 'axios';

const bmi = (weightKg, heightCm) => {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
}

const bmr = (weightKg, heightCm, age) => {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

const maintenanceCalories = (bmrValue, activityLevel) => {
    const activityMultipliers = {
        no: 1.2,
        light: 1.375,
        medium: 1.55,
        regular: 1.725,
        student: 1.9
    };
    return bmrValue * (activityMultipliers[activityLevel] || 1.2);
}

export { bmi, bmr, maintenanceCalories };