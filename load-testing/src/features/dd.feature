Feature: dd

  Scenario: dd Flow
    When I click ".relative.inline-flex.items-center.disabled:pointer-events-none.disabled:cursor-default.disabled:border-gray-100.disabled:bg-gray-100.disabled:text-gray-400.disabled:opacity-50.aria-disabled:pointer-events-none.aria-disabled:cursor-default.aria-disabled:border-gray-100.aria-disabled:bg-gray-100.aria-disabled:text-gray-400.ui-focus-visible:border-gray-100/0.ui-focus-visible:outline.ui-focus-visible:outline-3.ui-focus-visible:outline-offset-2.ui-focus-visible:outline-blue-600.dark:disabled:border-gray-600.dark:disabled:bg-gray-600.dark:disabled:text-gray-400.dark:disabled:opacity-50.dark:aria-disabled:border-gray-600.dark:aria-disabled:bg-gray-600.dark:aria-disabled:text-gray-400.dark:ui-focus-visible:outline-blue-400.ltr:!font-redesign.bg-brand.text-redesign-lg.font-normal.leading-none.!text-redesign-quartz-gray-100.hover:bg-redesign-slate-gray-500.hover:text-redesign-quartz-gray-100.active:bg-redesign-jade-green-300.active:!text-brand.dark:bg-white.dark:!text-brand.dark:hover:bg-redesign-quartz-gray-300.dark:active:bg-redesign-jade-green-300.rounded-[40px].px-redesign-4.pb-[14px].pt-[13px].cursor-pointer.align-text-bottom.self-stretch.lg:self-auto.justify-center.text-nowrap"
    Given I navigate to "https://www.deepl.com/en/translator"
    When I click "div"
    Given I navigate to "https://www.deepl.com/en/translator"
    When I click ".mobile:space-y-0.space-y-6"
    When I click "#textareasContainer"
    When I type "Ich schreibe " into "D-TEXTAREA"
    Then the action should complete