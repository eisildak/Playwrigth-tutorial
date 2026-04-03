Feature: Multi tab yonetimi
  Formlar linkine tiklayinca acilan yeni sekmede elementleri kontrol etmek istiyorum.

  Scenario: Formlar linki yeni sekmede acilmali ve icerik dogrulanmali
    Given I open the bpmyo homepage for multi tab check
    When I click Formlar and open it in a new tab
    Then the newly opened tab url should be "https://oidb.nny.edu.tr/?p=content&id=302"
    And I should see the "Formlar" heading in the new tab
    And I should see key form elements in the new tab
