Feature: Header-1-Ana-sayfa surekli link gezinti kontrolu
  Header-1 linklerinden baslayarak sayfa icindeki linklerde ileri-geri gezinmenin stabil oldugunu kontrol etmek istiyorum.

  Scenario: Header-1 linklerinden baslayan surekli gezinti limitte kalmali
    Given I run a quick link availability check on "https://bpmyo.nny.edu.tr/index.php"
    Then the quick link check should be successful
