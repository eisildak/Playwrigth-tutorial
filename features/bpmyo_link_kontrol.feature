Feature: BPMYO link saglik kontrolu
  Site kalitesi icin tum linklerde 404 kontrolu yapmak istiyorum.

  Scenario Outline: bpmyo.nny.edu.tr uzerindeki linklerde 404 olmamali (dinamik max pages)
    Given I run a link crawl on "https://bpmyo.nny.edu.tr/" with max <maxPages> pages
    Then I should not see any 404 links in crawl results

    Examples:
      | maxPages |
      |       10 |
      |       30 |
      |       60 |

  Scenario: bpmyo.nny.edu.tr strict link kontrolu (404, 5xx, network)
    Given I run a link crawl on "https://bpmyo.nny.edu.tr/" with max 30 pages
    Then I should not see any broken links in strict crawl results

  Scenario: bpmyo.nny.edu.tr tiklanabilir component deep kontrolu (404, 5xx, network)
    Given I run a clickable components crawl on "https://bpmyo.nny.edu.tr/" with max 30 pages
    Then I should not see any broken links in strict crawl results
