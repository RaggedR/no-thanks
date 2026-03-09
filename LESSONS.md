# LESSONS.md

## Evolutionary Training
- **Never track "best ever" by in-population fitness**: In co-evolutionary training, early generations have inflated scores because opponents are weak random agents. The true best individual is the one that performs best against an external benchmark (e.g., random agents), not the one with the highest in-population score.
- **Validate externally**: Always use an external validation method (truly random 50/50 opponents) to measure agent strength, not just the in-population fitness metric.
- **Feature power > model complexity**: Adding the exact `scoreChange` feature (computing actual score delta from taking a card) was more impactful than tuning hyperparameters. A powerful feature in a linear model beats a complex model with weak features.
