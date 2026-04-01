Feature: Header-1-Mezun surekli link gezinti kontrolu
  Mezun sayfasinda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario: Header-1-Mezun sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "https://mezun.nny.edu.tr/"
    Then the quick link check should be successful
