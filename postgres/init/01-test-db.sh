#!/bin/bash
# Runs once, on first initialisation of the data volume. Creates the database
# the test suite truncates, so tests can never touch the development data.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" <<-SQL
  CREATE DATABASE job_tracker_test;
SQL

echo "created database job_tracker_test"
