Feature: Sayfa guvenlik kontrolu
  Istemci tarafinda acik token veya secret degeri olmamali.

  Scenario Outline: feature URL'lerinde acik token kontrolu
    Given I run a deep client-side secret scan on all links in "<url>"
    Then I should not see any exposed tokens in scan results

    Examples:
      | url                               |
      | https://bpmyo.nny.edu.tr/         |
      | https://www.nny.edu.tr/?p=contact |

  Scenario Outline: feature URL'lerinde guvenlik header'lari bulunmali
    Given I run a security headers check on "<url>"
    Then I should see required security headers in response

    Examples:
      | url                               |
      | https://bpmyo.nny.edu.tr/         |
      | https://www.nny.edu.tr/?p=contact |

  Scenario Outline: https sayfalarda mixed content olmamali
    Given I run a mixed content check on "<url>"
    Then I should not see any insecure http resource links

    Examples:
      | url                               |
      | https://bpmyo.nny.edu.tr/         |
      | https://www.nny.edu.tr/?p=contact |
