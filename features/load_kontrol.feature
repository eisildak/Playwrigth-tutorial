Feature: Sayfa yuk ve performans kontrolu
  Yuksek trafik benzetiminde hiz ve hata oranini kontrol etmek istiyorum.

  Scenario Outline: Baseline trafikte performans bozulmamali
    Given I run a burst load check on "<url>" with <totalRequests> requests and <concurrency> concurrency
    Then I should keep error rate under <maxErrorRatePercent> percent in load check
    And I should keep p95 response time under <maxP95Ms> ms in load check
    And I should keep average response time under <maxAvgMs> ms in load check

    Examples:
      | url                               | totalRequests | concurrency | maxErrorRatePercent | maxP95Ms | maxAvgMs |
      | https://bpmyo.nny.edu.tr/         |            40 |           8 |                  20 |     5000 |     3000 |
      | https://www.nny.edu.tr/?p=contact |            40 |           8 |                  20 |     6000 |     3500 |

  Scenario Outline: Agresif trafikte performans kabul edilebilir seviyede kalmali
    Given I run a burst load check on "<url>" with <totalRequests> requests and <concurrency> concurrency
    Then I should keep error rate under <maxErrorRatePercent> percent in load check
    And I should keep p95 response time under <maxP95Ms> ms in load check
    And I should keep average response time under <maxAvgMs> ms in load check

    Examples:
      | url                       | totalRequests | concurrency | maxErrorRatePercent | maxP95Ms | maxAvgMs |
      | https://bpmyo.nny.edu.tr/ |           100 |          20 |                  25 |     8000 |     5000 |
      | https://bpmyo.nny.edu.tr/ |           300 |          30 |                  30 |    12000 |     7000 |

  Scenario Outline: Peak trafiginde ani yuklenmede servis ayakta kalmali
    Given I run a burst load check on "<url>" with <totalRequests> requests and <concurrency> concurrency
    Then I should keep error rate under <maxErrorRatePercent> percent in load check
    And I should keep p95 response time under <maxP95Ms> ms in load check
    And I should keep average response time under <maxAvgMs> ms in load check

    Examples:
      | url                               | totalRequests | concurrency | maxErrorRatePercent | maxP95Ms | maxAvgMs |
      | https://bpmyo.nny.edu.tr/         |           200 |          30 |                  30 |    12000 |     7000 |
      | https://www.nny.edu.tr/?p=contact |           200 |          30 |                  35 |    14000 |     8000 |

  Scenario Outline: Soak testte uzun sureli yukte performans stabil kalmali
    Given I run a burst load check on "<url>" with <totalRequests> requests and <concurrency> concurrency
    Then I should keep error rate under <maxErrorRatePercent> percent in load check
    And I should keep p95 response time under <maxP95Ms> ms in load check
    And I should keep average response time under <maxAvgMs> ms in load check

    Examples:
      | url                               | totalRequests | concurrency | maxErrorRatePercent | maxP95Ms | maxAvgMs |
      | https://bpmyo.nny.edu.tr/         |           600 |          12 |                  25 |     9000 |     5500 |
      | https://www.nny.edu.tr/?p=contact |           600 |          12 |                  30 |    10000 |     6000 |
