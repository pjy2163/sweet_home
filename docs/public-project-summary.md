# SweetHome Public Project Summary

SweetHome is a data pipeline and analysis project for comparing residential candidate areas in Seoul.

The project focuses on helping users compare areas with objective data instead of recommending a specific house or investment decision.

## Current Scope

- Seoul administrative-dong based region model
- Region master table
- Legal-dong to administrative-dong mapping
- CSV-based ETL pipeline
- Data dictionary and inventory

## Current Outputs

- `data/processed/region_master.csv`
- `data/processed/dong_mapping.csv`

## Not Included

- Raw large public datasets
- Private product planning notes
- API keys or service credentials
- Investment recommendation logic

## Direction

The next stage is to build fact tables for population, safety, real estate, and commercial indicators, then use them to generate an MVP comparison report.
