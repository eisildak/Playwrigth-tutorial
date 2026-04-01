Feature: Header-1-Formlar surekli link gezinti kontrolu
  Formlar sayfasinda surekli link gezinmesinin limit ve hata durumlarini kontrol etmek istiyorum.

  Scenario: Header-1-Formlar sayfasinda surekli gezinti limitte kalmali
    Given I run a quick link availability check on "https://oidb.nny.edu.tr/?p=content&id=302"
    Then the quick link check should be successful
