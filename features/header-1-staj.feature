Feature: Header-1-Staj surekli link gezinti kontrolu
  Staj sayfasinda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario: Header-1-Staj sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "https://bpmyo.nny.edu.tr/index.php?p=content&id=14"
    Then the quick link check should be successful
