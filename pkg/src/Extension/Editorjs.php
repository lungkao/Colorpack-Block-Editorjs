<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

namespace Colorpack\Plugin\Editors\Editorjs\Extension;

\defined('_JEXEC') or die;

use Colorpack\Plugin\Editors\Editorjs\Helper\EditorRenderer;
use Colorpack\Plugin\Editors\Editorjs\Helper\ImageUploader;
use Colorpack\Plugin\Editors\Editorjs\Provider\EditorjsProvider;
use Joomla\CMS\Event\Editor\EditorSetupEvent;
use Joomla\CMS\Layout\LayoutHelper;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\Event\Event;
use Joomla\Event\SubscriberInterface;

final class Editorjs extends CMSPlugin implements SubscriberInterface
{
	protected $autoloadLanguage = true;

	public static function getSubscribedEvents(): array
	{
		$events = ['onAjaxEditorjs' => 'onAjaxEditorjs'];

		// Joomla 5+ discovers editors through a registry. Joomla 4 calls onDisplay() directly.
		if (class_exists(EditorSetupEvent::class))
		{
			$events['onEditorSetup'] = 'onEditorSetup';
		}

		return $events;
	}

	public function onEditorSetup($event): void
	{
		$event->getEditorsRegistry()->add(
			new EditorjsProvider($this->params, $this->getApplication(), $this->getDispatcher())
		);
	}

	public function onAjaxEditorjs($event = null): void
	{
		(new ImageUploader($this->getApplication(), $this->params))->handle();
	}

	/**
	 * Joomla 4 entry point.
	 */
	public function onDisplay($name, $content, $width, $height, $col, $row, $buttons = true, $id = null, $asset = null, $author = null, $params = [])
	{
		$id = $id ?: $name;

		return EditorRenderer::render(
			$this->getApplication(),
			$this->params,
			$name,
			(string) $content,
			$id,
			$height,
			!empty($params['readonly']),
			$this->displayButtonsLegacy($id, $buttons)
		);
	}

	private function displayButtonsLegacy(string $id, $buttons): string
	{
		if (!\is_array($buttons) && $buttons !== true)
		{
			return '';
		}

		$event  = new Event('getButtons', ['editor' => $id, 'buttons' => $buttons]);
		$result = $this->getDispatcher()->dispatch('getButtons', $event);

		return LayoutHelper::render('joomla.editors.buttons', $result['result']);
	}
}
