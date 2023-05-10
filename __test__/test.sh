#!/bin/bash

filtered_test=$(grep -rnwl ./__test__ -e "test.only\|it.only\|describe.only" --include \*.ts | tr '\n' ' ')

if [ "$verbose_test" == 'true' ]
then
  cross-env USE_QUEUE=false NODE_ENV=test jest $filtered_test --collectCoverage  && jest-coverage-badges --output badges
else
  cross-env USE_QUEUE=false NODE_ENV=test jest $filtered_test --silent --collectCoverage  && jest-coverage-badges --output badges
fi

